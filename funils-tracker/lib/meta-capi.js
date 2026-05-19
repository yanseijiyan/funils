/* lib/meta-capi — POST pra Meta Graph Conversions API */

async function sendMetaCapi({ pixelId, token, event, testCode, apiVersion }) {
  if (!pixelId) return { ok: false, skipped: 'no_meta_pixel' };
  if (!token)   return { ok: false, skipped: 'no_capi_token' };
  const ver = apiVersion || 'v20.0';
  const url = `https://graph.facebook.com/${ver}/${encodeURIComponent(pixelId)}/events` +
              `?access_token=${encodeURIComponent(token)}`;
  const body = { data: [event] };
  if (testCode) body.test_event_code = testCode;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, body: json };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

module.exports = { sendMetaCapi };
