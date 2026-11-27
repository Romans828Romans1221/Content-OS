// Task 3B.5: honest angles. An angle is "present" only when the source supports it with at least
// one exact quote. Anything else is "not_present" and is never passed to the director.
const ANGLE_KEYS = ["faith_life", "mindset", "technical"];

function toArray(v) {
  if (v === undefined || v === null || v === "") return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

function normalizeAngles(angles) {
  if (!angles.angles || typeof angles.angles !== "object") angles.angles = {};
  for (const key of ANGLE_KEYS) {
    const a = (angles.angles[key] = angles.angles[key] || {});
    a.source_quotes = toArray(a.source_quotes);
    a.unsupported = toArray(a.unsupported);
    if (a.status !== "present" && a.status !== "not_present") {
      a.status = a.summary && a.source_quotes.length ? "present" : "not_present";
    }
    if (a.status === "present" && a.source_quotes.length === 0) {
      a.status = "not_present";
      a.unsupported.push("marked present but no exact quote was given");
    }
    if (a.status === "not_present") a.summary = null;
  }
  return angles;
}

function presentAngles(angleMap) {
  return Object.fromEntries(Object.entries(angleMap).filter(([, a]) => a.status === "present"));
}

module.exports = { normalizeAngles, presentAngles, ANGLE_KEYS };
