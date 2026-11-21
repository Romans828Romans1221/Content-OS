// Single source of truth for model, mime types, and folders.
require("dotenv").config();
const path = require("path");

const ROOT = __dirname;

module.exports = {
  // gemini-3.8-flash is the string that already passed Stage 2 on your machine.
  // Verify any change with: node ping-model.js
  // Override without editing code: GEMINI_MODEL=... in .env
  MODEL: process.env.GEMINI_MODEL || "gemini-3.8-flash",

  FOLDERS: {
    brandAssets: path.join(ROOT, "00-Brand-Assets"),
    broll: path.join(ROOT, "00-Personal-B-Roll"),
    inbox: path.join(ROOT, "01-Raw-Inbox"),
    ready: path.join(ROOT, "02-Ready-To-Publish"),
    published: path.join(ROOT, "03-Published"),
  },

  // Keyed by file extension. m4a is audio/mp4 in most APIs; confirm with ping-model.js.
  MIME: {
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".md": "text/plain",
    ".txt": "text/plain",
  },

  // Env vars required at stage 0. No Pixabay: zero stock footage.
  REQUIRED_ENV: ["GEMINI_API_KEY", "MAKE_WEBHOOK_URL"],
};
