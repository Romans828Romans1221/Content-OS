// ContentOS pipeline, staged. Usage:
//   node transcribe.js --stage=0                  env check only
//   node transcribe.js --file=01-Raw-Inbox/x.m4a  run through stage 4
//   node transcribe.js --file=... --stage=2       stop after stage 2
//   node transcribe.js --file=... --fresh         ignore the stage 2 cache
// Stages: 0 env, 1 ingest, 2 strategist, 3 director, 4 package (written to disk)
// Stage 5 (vault) and 6 (Slack approval) are added in later sprints.
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { MODEL, MIME, FOLDERS, REQUIRED_ENV } = require("./config");
const { withRetry, describeError } = require("./retry");
const alert = require("./alert");
const { generateChecked } = require("./generate");
const { validateStrategist, validateDirector } = require("./validate");
const { normalizeAngles, presentAngles } = require("./angles");
const { verifyQuotes } = require("./fidelity");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v === undefined ? true : v];
  })
);
const MAX_STAGE = args.stage !== undefined ? Number(args.stage) : 4;
const CACHE_DIR = path.join(__dirname, ".cache");
const status = [];

function record(stage, name, ok, detail = "") {
  status.push({ stage, name, result: ok ? "PASS" : "FAIL", detail });
}

function printTable() {
  console.log("\nStage | Name       | Result | Detail");
  for (const s of status) {
    console.log(`${s.stage}     | ${s.name.padEnd(10)} | ${s.result}   | ${s.detail}`);
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

async function fail(stage, name, err) {
  const detail = describeError(err);
  record(stage, name, false, detail);
  printTable();
  const src = args.file ? path.basename(String(args.file)) : "no file";
  await alert.send(`Pipeline failed at stage ${stage} (${name}) on ${src}: ${detail}`.slice(0, 500));
  process.exit(1);
}

async function main() {
  // Stage 0: env check
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) await fail(0, "env", new Error(`missing: ${missing.join(", ")}`));
  record(0, "env", true, `model=${MODEL}`);
  if (MAX_STAGE === 0) return printTable();

  if (!args.file) await fail(1, "ingest", new Error("pass --file=<path>"));
  const filePath = path.resolve(args.file);
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext];
  if (!mime) await fail(1, "ingest", new Error(`unsupported type: ${ext}`));
  const baseName = path.basename(filePath, ext);
  const cacheFile = path.join(CACHE_DIR, `${slugify(baseName)}.stage2.json`);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Stage 1: ingest (text read directly, audio uploaded). Skipped when stage 2 is cached.
  const useCache = !args.fresh && fs.existsSync(cacheFile);
  let sourceParts;
  try {
    if (useCache) {
      record(1, "ingest", true, "skipped (stage 2 cached)");
    } else if (ext === ".md" || ext === ".txt") {
      const sourceText = fs.readFileSync(filePath, "utf8");
      sourceParts = [{ text: `SOURCE TEXT (the author's own writing):\n${sourceText}` }];
      record(1, "ingest", true, `${sourceText.length} characters`);
    } else {
      const up = await withRetry(
        () => ai.files.upload({ file: filePath, config: { mimeType: mime } }),
        { label: "upload" }
      );
      sourceParts = [{ fileData: { fileUri: up.uri, mimeType: up.mimeType || mime } }];
      record(1, "ingest", true, `uploaded ${path.basename(filePath)}`);
    }
  } catch (err) {
    await fail(1, "ingest", err);
  }
  if (MAX_STAGE === 1) return printTable();

  // Stage 2: strategist. Structures the author's own thinking; never invents.
  let angles;
  try {
    if (useCache) {
      angles = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      record(2, "strategist", true, "from cache (use --fresh to redo)");
    } else {
      const res = await generateChecked(ai, "strategist", validateStrategist, {
            contents: [
              {
                role: "user",
                parts: [
                  ...sourceParts,
                  {
                    text:
                      "Transcribe or read the source. Then extract three angles: faith_life, mindset, technical. " +
                      "Use ONLY ideas present in the source. Never stretch the author's words to fill an angle. " +
                      "For each angle return: status (\"present\" or \"not_present\"), summary, source_quotes " +
                      "(exact quotes copied word for word from the source), and unsupported (an array of strings: ideas you were tempted to add). " +
                      "An angle is \"present\" only if the source clearly speaks to it and you can give at least one exact quote. " +
                      "Otherwise set status to \"not_present\", summary to null, source_quotes to [], and give a short reason in unsupported. " +
                      "The technical angle is the author's own technology, career, business or building work. Scripture or mindset reframed as logic models or systems is NOT technical. " +
                      "Return JSON: {transcript, angles:{faith_life:{status,summary,source_quotes,unsupported}, " +
                      "mindset:{...}, technical:{...}}}.",
                  },
                ],
              },
            ],
            config: { responseMimeType: "application/json" },
          });
      angles = JSON.parse(res.text);
      angles.model_used = res.modelUsed;
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(angles, null, 2));
      record(2, "strategist", true, Object.keys(angles.angles || {}).join(",") + ` [${res.modelUsed}]`);
    }
  } catch (err) {
    await fail(2, "strategist", err);
  }
  normalizeAngles(angles);
  const fidelitySource = ext === ".md" || ext === ".txt" ? fs.readFileSync(filePath, "utf8") : angles.transcript || "";
  const fid = verifyQuotes(angles, fidelitySource);
  console.log(`[fidelity] ${fid.checked} quote(s) checked: ${fid.exact} exact, ${fid.close} close, ${fid.missing} not found` + (fid.downgraded.length ? `; downgraded to not_present: ${fid.downgraded.join(", ")}` : ""));
  if (fid.downgraded.length || fid.missing * 2 > fid.checked) {
    await alert.send(`Fidelity check on ${path.basename(filePath)}: ${fid.missing} of ${fid.checked} quotes were not found in the source` + (fid.downgraded.length ? `. Downgraded to not_present: ${fid.downgraded.join(", ")}` : "") + ".");
  }
  console.log("[angles] " + Object.entries(angles.angles).map(([k, a]) => `${k}:${a.status}`).join(" "));
  if (!Object.values(angles.angles).some((a) => a.status === "present")) {
    await fail(2, "strategist", new Error("no angle was present in the source"));
  }
  if (MAX_STAGE === 2) return printTable();

  // Stage 3: creative director. No stock-footage search; matching to your own B-roll comes in Sprint 6.
  let director;
  try {
    const res = await generateChecked(ai, "director", validateDirector, {
          contents:
            "From these angles, return JSON {hook, script_body, camera_setup, editing_cues, broll_query, beat_query}. " +
            "script_body is 75-150 words. camera_setup must be low-energy and realistic. " +
            "Do not add ideas that are not in the angles.\n\n" +
            JSON.stringify(presentAngles(angles.angles)),
          config: { responseMimeType: "application/json" },
        });
    director = JSON.parse(res.text);
    director.model_used = res.modelUsed;
    record(3, "director", true, `hook: ${String(director.hook).slice(0, 40)}`);
  } catch (err) {
    await fail(3, "director", err);
  }
  if (MAX_STAGE === 3) return printTable();

  // Stage 4: package. One folder per item; nothing overwritten.
  try {
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(FOLDERS.ready, `${date}_${slugify(baseName)}`);
    fs.mkdirSync(dir, { recursive: true });
    const pkg = {
      item_id: path.basename(dir),
      source_file: path.basename(filePath),
      transcript: angles.transcript,
      angles: angles.angles,
      director,
      model_used: angles.model_used || null,
      requires_ai_editing: false,
      requires_animation: false,
      status: "draft",
    };
    fs.writeFileSync(path.join(dir, "content_package.json"), JSON.stringify(pkg, null, 2));
    record(4, "package", true, path.relative(__dirname, dir));
  } catch (err) {
    await fail(4, "package", err);
  }
  printTable();
}

main().catch((err) => fail("?", "unexpected", err));
