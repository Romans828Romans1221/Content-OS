// Task 3B.3: fidelity check. Every quote the AI says it took from your writing is looked up in your actual text.
// A quote that is not there is removed. An angle left with no verified quote becomes not_present.
// Text sources are checked against your file. Audio sources are checked against the transcript the model wrote.
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
const loose = (s) => norm(s).replace(/[^a-z0-9]+/g, "");

// A quote may use "..." to skip words. Each piece on either side has to be in the source.
function pieces(q) {
  return String(q)
    .split(/\.\.\.|\u2026/)
    .map((x) => x.trim())
    .filter((x) => loose(x).length >= 8);
}

function verifyQuotes(angles, sourceText) {
  const S = norm(sourceText);
  const L = loose(sourceText);
  const report = { checked: 0, exact: 0, close: 0, missing: 0, downgraded: [] };
  for (const [key, a] of Object.entries(angles.angles || {})) {
    if (a.status !== "present") continue;
    const kept = [];
    const removed = [];
    for (const q of a.source_quotes || []) {
      report.checked++;
      const parts = pieces(q);
      if (parts.length && parts.every((p) => S.includes(norm(p)))) {
        report.exact++;
        kept.push(q);
      } else if (parts.length && parts.every((p) => L.includes(loose(p)))) {
        report.close++; // same words, only punctuation or spacing differs
        kept.push(q);
      } else {
        report.missing++;
        removed.push(q);
      }
    }
    a.source_quotes = kept;
    if (removed.length) {
      a.removed_quotes = removed;
      a.unsupported = [...(a.unsupported || []), `${removed.length} quote(s) removed: not found in the source`];
    }
    if (kept.length === 0) {
      a.status = "not_present";
      a.summary = null;
      report.downgraded.push(key);
    }
  }
  return report;
}

module.exports = { verifyQuotes };
