// Task 1.2: create the state-machine folders. Safe to re-run.
const fs = require("fs");
const path = require("path");
const { FOLDERS } = require("./config");

const extra = [
  path.join(FOLDERS.brandAssets, "fonts"),
  path.join(FOLDERS.brandAssets, "music"),
];

for (const dir of [...Object.values(FOLDERS), ...extra]) {
  fs.mkdirSync(dir, { recursive: true });
  const keep = path.join(dir, ".gitkeep");
  if (!fs.existsSync(keep)) fs.writeFileSync(keep, "");
  console.log("ok  ", path.relative(__dirname, dir));
}
