// Task 3B.4: shape checks for AI answers. Each validator returns a list of problems (empty = valid).
const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function validateStrategist(d) {
  if (!isObj(d)) return ["top level must be a JSON object"];
  const problems = [];
  if (!isStr(d.transcript)) problems.push("transcript is missing or empty");
  if (!isObj(d.angles)) {
    problems.push("angles is missing");
    return problems;
  }
  for (const key of ["faith_life", "mindset", "technical"]) {
    const a = d.angles[key];
    if (!isObj(a)) {
      problems.push(`angles.${key} is missing`);
      continue;
    }
    if (a.status === "present" && !isStr(a.summary)) problems.push(`angles.${key} is marked present but has no summary`);
  }
  return problems;
}

function validateDirector(d) {
  if (!isObj(d)) return ["top level must be a JSON object"];
  const problems = [];
  for (const key of ["hook", "script_body", "camera_setup", "broll_query", "beat_query"]) {
    if (!isStr(d[key])) problems.push(`${key} is missing or empty`);
  }
  const cues = d.editing_cues;
  if (!(isStr(cues) || (Array.isArray(cues) && cues.length > 0))) problems.push("editing_cues is missing or empty");
  if (isStr(d.script_body)) {
    const words = d.script_body.trim().split(/\s+/).length;
    if (words < 60 || words > 180) problems.push(`script_body has ${words} words, it must be 75 to 150`);
  }
  return problems;
}

module.exports = { validateStrategist, validateDirector };
