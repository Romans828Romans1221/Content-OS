// Task 1.7: post a message to the private Slack alerts channel.
// Never throws: a broken alert must not crash the pipeline.
require("./config");

async function send(text) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_ALERT_CHANNEL;
  if (!token || !channel) {
    console.warn("[alert] SLACK_BOT_TOKEN or SLACK_ALERT_CHANNEL missing; not sent.");
    return { ok: false, error: "missing_env" };
  }
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text: `[ContentOS] ${text}` }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!data.ok) {
      console.warn(`[alert] Slack refused the message: ${data.error}`);
      return { ok: false, error: data.error };
    }
    return { ok: true };
  } catch (err) {
    const cause = err.cause && err.cause.code ? ` (cause: ${err.cause.code})` : "";
    console.warn(`[alert] could not reach Slack: ${err.message}${cause}`);
    return { ok: false, error: err.message };
  }
}

module.exports = { send };

if (require.main === module) {
  const text = process.argv.slice(2).join(" ") || "test alert";
  send(text).then((r) => process.exit(r.ok ? 0 : 1));
}
