// Task 3B.1: persona on every AI call. Built from persona.json, sent as the system instruction.
// Only themes with status "approved" are ever included. AI-suggested themes stay out until you approve them.
const fs = require("fs");
const path = require("path");

function load() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "persona.json"), "utf8"));
  } catch (e) {
    throw new Error(`persona.json unreadable: ${e.message}`);
  }
}

const trim = (x) => String(x).replace(/[.\s]+$/, "");
const list = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);
const scriptureText = (s) => (typeof s === "string" ? s : s && (s.ref || s.reference) ? s.ref || s.reference : JSON.stringify(s));

function approvedThemes(p) {
  return list(p.themes).filter((t) => t.status === "approved");
}

// label "strategist" gets the light version (voice and scripture rules only) so the persona
// can never pull themes into an extraction step. Every other call gets the full version.
function build(label) {
  const p = load();
  const full = label !== "strategist";
  const out = [];
  out.push(
    `PERSONA for ${p.name || "the author"}. These rules shape HOW you write. They are NOT a source of ideas: ` +
      "never add an idea, claim, theme or scripture reference that the author's own source does not express."
  );
  if (p.mission) out.push(`Mission: ${p.mission}`);
  const v = p.voice || {};
  const voice = [];
  if (list(v.tone).length) voice.push(`tone: ${list(v.tone).join(", ")}`);
  if (v.style) voice.push(`style: ${trim(v.style)}`);
  if (v.point_of_view) voice.push(`point of view: ${trim(v.point_of_view)}`);
  if (v.emojis === false) voice.push("no emojis, ever");
  if (voice.length) out.push(`Voice: ${voice.join(". ")}.`);
  const sc = p.scripture || {};
  if (sc.translation || list(sc.rules).length) {
    out.push(
      `Scripture: translation ${sc.translation || "as the author wrote it"}. ` +
        list(sc.rules).join(" ") +
        " Never add or invent a verse reference. Use only scripture the author wrote."
    );
  }
  let themeCount = 0;
  if (full) {
    if (list(p.banned_words).length) out.push(`Never use these words: ${list(p.banned_words).join(", ")}.`);
    if (list(p.banned_patterns).length) out.push(`Never do this: ${list(p.banned_patterns).join(" | ")}`);
    const themes = approvedThemes(p);
    themeCount = themes.length;
    if (themes.length) {
      out.push(
        "Approved themes (recurring messages the author has approved). Mention one only when the material clearly expresses it. Never force one in:\n" +
          themes
            .map((t) => `- ${t.title}: ${t.claim}${list(t.scriptures).length ? ` (scripture: ${list(t.scriptures).map(scriptureText).join("; ")})` : ""}`)
            .join("\n")
      );
    }
  } else {
    out.push("You are extracting from the source, not writing posts. Exact quotes must stay word for word even if they contain a word the author avoids.");
  }
  return { text: out.join("\n\n"), themeCount, full };
}

module.exports = { build, approvedThemes };
