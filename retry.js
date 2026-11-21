// Network hardening. Node's "fetch failed" hides the real reason in err.cause
// (ECONNRESET, UND_ERR_SOCKET, ETIMEDOUT, ...). describeError() surfaces it,
// and withRetry() retries transient failures with backoff and a per-try timeout.
const dns = require("dns");
// Prefer IPv4: some home networks stall or drop IPv6 connections to Google.
dns.setDefaultResultOrder("ipv4first");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function describeError(err) {
  const cause = err && err.cause;
  const code = cause && (cause.code || cause.message);
  return code ? `${err.message} (cause: ${code})` : String((err && err.message) || err);
}

// Retry: network drops, timeouts, 429, and any 5xx (Google "high demand" 503).
// Do not retry: bad key, bad model, bad request (other 4xx). They will not fix themselves.
function isTransient(err) {
  const msg = describeError(err);
  if (/UNAVAILABLE|high demand|"code":\s*(429|5\d\d)/i.test(msg)) return true;
  const status =
    err && typeof err.status === "number" ? err.status :
    err && typeof err.code === "number" ? err.code : null;
  if (status !== null) return status === 429 || (status >= 500 && status < 600);
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR|socket|network/i.test(msg);
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s (ETIMEDOUT)`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function withRetry(fn, { tries = 6, label = "call", timeoutMs = 180000 } = {}) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === tries) break;
      const wait = Math.min(2000 * 2 ** (i - 1), 30000);
      console.warn(`[retry] ${label} attempt ${i}/${tries} failed: ${describeError(err).slice(0, 160)}. Waiting ${wait / 1000}s...`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

module.exports = { withRetry, describeError };
