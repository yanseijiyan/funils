/* lib/tiktok-events — POST pra TikTok Events API v1.3
 * https://business-api.tiktok.com/portal/docs?id=1771101027431425
 */

/* Aliases pra eventos canônicos do TikTok */
const ALIAS = {
  PageView: 'Pageview',
  Purchase: 'CompletePayment'
};

async function sendTikTokEvents({ pixelId, token, event, testCode }) {
  if (!pixelId) return { ok: false, skipped: 'no_tiktok_pixel' };
  if (!token)   return { ok: false, skipped: 'no_tiktok_token' };
  const e = Object.assign({}, event);
  if (ALIAS[e.event]) e.event = ALIAS[e.event];
  const body = { event_source: 'web', event_source_id: pixelId, data: [e] };
  if (testCode) body.test_event_code = testCode;
  try {
    const r = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Token': token },
      body: JSON.stringify(body)
    });
    const json = await r.json().catch(() => ({}));
    const apiOk = r.ok && (!json.code || json.code === 0);
    return { ok: apiOk, status: r.status, body: json };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

module.exports = { sendTikTokEvents, ALIAS };
