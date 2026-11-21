// Task 1.5: prove the model string and API key work with a tiny call.
const { GoogleGenAI } = require("@google/genai");
const { MODEL } = require("./config");
const { withRetry, describeError } = require("./retry");

(async () => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const res = await withRetry(
      () =>
        ai.models.generateContent({
          model: MODEL,
          contents: "Reply with the single word: ok",
          config: { responseMimeType: "application/json" },
        }),
      { label: "ping" }
    );
    console.log(`model=${MODEL} reply=${(res.text || "").trim()}`);
  } catch (err) {
    console.error(`FAIL model=${MODEL}: ${describeError(err)}`);
    process.exit(1);
  }
})();
