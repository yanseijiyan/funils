/* lib/hash — SHA256 utils + builders de user_data Meta/TikTok */
const crypto = require('crypto');

function sha256(v) {
  if (v === null || v === undefined || v === '') return null;
  return crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
}

function digitsOnly(v) { return String(v || '').replace(/\D/g, ''); }

/* Constrói user_data no formato Meta CAPI (chaves: em, ph, fn, ln, ct, st, zp, country, external_id, fbp, fbc) */
function userDataMeta(ud, req) {
  ud = ud || {};
  const out = {};
  out.client_ip_address = clientIp(req);
  out.client_user_agent = ud.client_user_agent || (req && req.headers['user-agent']) || null;
  if (ud.fbp) out.fbp = ud.fbp;
  if (ud.fbc) out.fbc = ud.fbc;
  if (ud.fbclid && !out.fbc) {
    out.fbc = 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + ud.fbclid;
  }
  if (ud.email)       out.em = [sha256(ud.email)];
  if (ud.phone)       out.ph = [sha256(digitsOnly(ud.phone))];
  if (ud.first_name)  out.fn = [sha256(ud.first_name)];
  if (ud.last_name)   out.ln = [sha256(ud.last_name)];
  if (ud.city)        out.ct = [sha256(ud.city)];
  if (ud.state)       out.st = [sha256(ud.state)];
  if (ud.zip)         out.zp = [sha256(digitsOnly(ud.zip))];
  if (ud.country)     out.country = [sha256(ud.country)];
  if (ud.external_id) out.external_id = [sha256(ud.external_id)];
  return out;
}

/* Constrói user no formato TikTok Events API (chaves: email, phone, first_name, ttp, ttclid, ip, user_agent...) */
function userDataTikTok(ud, req) {
  ud = ud || {};
  const out = {};
  out.ip = clientIp(req);
  out.user_agent = ud.client_user_agent || (req && req.headers['user-agent']) || null;
  if (ud.ttp)         out.ttp         = ud.ttp;
  if (ud.ttclid)      out.ttclid      = ud.ttclid;
  if (ud.email)       out.email       = [sha256(ud.email)];
  if (ud.phone)       out.phone       = [sha256('+' + digitsOnly(ud.phone))];
  if (ud.first_name)  out.first_name  = [sha256(ud.first_name)];
  if (ud.last_name)   out.last_name   = [sha256(ud.last_name)];
  if (ud.city)        out.city        = [sha256(ud.city)];
  if (ud.state)       out.state       = [sha256(ud.state)];
  if (ud.zip)         out.zip_code    = [sha256(digitsOnly(ud.zip))];
  if (ud.country)     out.country     = [sha256(ud.country)];
  if (ud.external_id) out.external_id = [sha256(ud.external_id)];
  return out;
}

function clientIp(req) {
  if (!req || !req.headers) return null;
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || null;
}

async function readJson(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

module.exports = { sha256, digitsOnly, userDataMeta, userDataTikTok, clientIp, readJson };
