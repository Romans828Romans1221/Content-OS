// Task 1.13: model fallback for generateContent.
// Tries each model in the chain. A busy or unreachable model (503, socket drop) gets 2 tries.
// A model that times out is skipped after ONE timeout (a second one would just burn minutes).
// A model Google refuses (404 "no longer available", bad request) is skipped at once.
// If a fallback model answers, Slack is told which one. If all fail, the error lists every model.
// Override without editing code: GEMINI_MODEL_CHAIN=modelA,modelB and GEMINI_TIMEOUT_MS=120000
const { MODEL } = require("./config");
const { describeError } = require("./retry");
const alert = require("./alert");

const TRIES_PER_MODEL = 2;
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 120000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chain() {
  const fromEnv = process.env.GEMINI_MODEL_CHAIN;
  const list = fromEnv
    ? fromEnv.split(",").map((s) => s.trim()).filter(Boolean)
    : [MODEL, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
  return [...new Set(list)];
}

function isTimeout(text) {
  return /timed out after/i.test(text);
}

function isTransient(text) {
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR|socket|network|UNAVAILABLE|high demand|\b(429|500|502|503|504)\b/i.test(
    text
  );
}

function withTimeout(promise, ms) {
  promise.catch(() => {}); // a late failure after we gave up must not crash Node
  let timer;
  const clock = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, clock]).finally(() => clearTimeout(timer));
}

async function generate(ai, label, params) {
  const models = chain();
  const problems = [];
  for (let m = 0; m < models.length; m++) {
    const model = models[m];
    for (let i = 1; i <= TRIES_PER_MODEL; i++) {
      const started = Date.now();
      try {
        const res = await withTimeout(ai.models.generateContent({ ...params, model }), TIMEOUT_MS);
        res.modelUsed = model;
        console.log(`[model] ${label} ${model} answered in ${((Date.now() - started) / 1000).toFixed(1)}s`);
        if (m > 0) {
          await alert.send(`${label}: ${models[0]} unavailable (${problems[0]}). Used fallback model ${model}.`);
        }
        return res;
      } catch (err) {
        const text = describeError(err).replace(/\s+/g, " ");
        const why = text.slice(0, 100);
        console.warn(`[model] ${label} ${model} attempt ${i}/${TRIES_PER_MODEL} failed after ${((Date.now() - started) / 1000).toFixed(1)}s: ${why}`);
        if (isTimeout(text) || !isTransient(text) || i === TRIES_PER_MODEL) {
          problems.push(`${model}: ${why}`);
          break;
        }
        await sleep(2000 * i);
      }
    }
  }
  throw new Error(`${label}: all models failed. ${problems.join(" | ")}`);
}

module.exports = { generate, chain };
