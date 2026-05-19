/* funils tracker — core client-side
 * Substitui Utmify. Cobre afiliado + seller. Meta Pixel + CAPI + TikTok Pixel + TikTok Events API.
 *
 * Carrega DEPOIS de um adapter (adapters/<plataforma>.js) que define window._tracking.adapter.
 * Config global esperada em window._tracking:
 *   { pixel_id, tiktok_pixel_id?, enabled?, commission_rate?, auto_events?, products? }
 *
 * API pública (em window.tracker):
 *   tracker.event(name, params?, extras?)   — dispara Meta + TikTok client + CAPI servers
 *   tracker.identify({email, phone, first_name, last_name, city, state, zip, country, external_id})
 *   tracker.getValues()                     — debug
 *   tracker.getEventId()
 *
 * Auto-eventos (via auto_events no config):
 *   PageView          — sempre
 *   ViewContent       — se auto_events.ViewContent !== false
 *   InitiateCheckout  — em clique de link de checkout (se auto_events.InitiateCheckout !== false)
 */
(function () {
  'use strict';

  var CFG = window._tracking || {};
  var ADAPTER = CFG.adapter || { name: 'none', checkoutDomains: [], paramMap: {} };
  var PIXEL_ID = CFG.pixel_id || null;
  var TT_PIXEL = CFG.tiktok_pixel_id || null;
  var ENABLED = CFG.enabled !== false;
  var AUTO = Object.assign({ ViewContent: true, InitiateCheckout: true }, CFG.auto_events || {});
  var COMMISSION = typeof CFG.commission_rate === 'number' ? CFG.commission_rate : 1;
  var PRODUCTS = CFG.products || {};
  var STORAGE_PREFIX = 'fnl_';
  var COOKIE_DAYS = 90;

  var KEYS = [
    'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
    'fbclid','ttclid','gclid','msclkid',
    'src','sck','xcod',
    'tid','vtid','hop',
    'aff','affid','ref'
  ];

  if (!ENABLED) return;

  // ─── utils ────────────────────────────────────────────────────────────
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function setCookie(k, v) {
    try {
      var d = new Date(); d.setTime(d.getTime() + COOKIE_DAYS * 864e5);
      document.cookie = STORAGE_PREFIX + k + '=' + encodeURIComponent(v) +
        ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
    } catch (e) {}
  }
  function getCookie(k) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + STORAGE_PREFIX + k + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }
  function ssSet(k, v) { try { sessionStorage.setItem(STORAGE_PREFIX + k, v); } catch (e) {} }
  function ssGet(k)    { try { return sessionStorage.getItem(STORAGE_PREFIX + k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(STORAGE_PREFIX + k, v); } catch (e) {} }
  function lsGet(k)    { try { return localStorage.getItem(STORAGE_PREFIX + k); } catch (e) { return null; } }

  // ─── 1. TikTok Pixel auto-load (se config tiver tiktok_pixel_id) ─────
  function loadTikTokPixel() {
    if (!TT_PIXEL || typeof window.ttq !== 'undefined') return;
    /* TikTok official snippet (minified-ish) */
    !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.instance=function(t){var e=ttq._i[t]||[];for(var n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
      ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
        var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;
        var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load(TT_PIXEL);ttq.page();
    }(window,document,'ttq');
  }

  // ─── 2. harvest UTMs / click_ids ──────────────────────────────────────
  function harvest() {
    try {
      var p = new URLSearchParams(window.location.search);
      KEYS.forEach(function (k) {
        var v = p.get(k);
        if (v) { ssSet(k, v); lsSet(k, v); setCookie(k, v); }
      });
    } catch (e) {}
  }

  function getValues() {
    var out = {};
    KEYS.forEach(function (k) {
      var v = ssGet(k) || lsGet(k) || getCookie(k);
      if (v) out[k] = v;
    });
    var fbp = (document.cookie.match(/_fbp=([^;]+)/) || [])[1];
    var fbc = (document.cookie.match(/_fbc=([^;]+)/) || [])[1];
    var ttp = (document.cookie.match(/_ttp=([^;]+)/) || [])[1];
    if (fbp) out._fbp = decodeURIComponent(fbp);
    if (fbc) out._fbc = decodeURIComponent(fbc);
    if (ttp) out._ttp = decodeURIComponent(ttp);
    if (out.fbclid && !out._fbc) out._fbc = 'fb.1.' + Date.now() + '.' + out.fbclid;
    return out;
  }

  // ─── 3. identify (persiste PII pra próximos eventos) ──────────────────
  var IDENTITY = {};
  function identify(userData) {
    if (!userData) return;
    var clean = {};
    if (userData.email)        clean.email        = String(userData.email).trim().toLowerCase();
    if (userData.phone)        clean.phone        = String(userData.phone).replace(/\D/g, '');
    if (userData.first_name)   clean.first_name   = String(userData.first_name).trim().toLowerCase();
    if (userData.last_name)    clean.last_name    = String(userData.last_name).trim().toLowerCase();
    if (userData.city)         clean.city         = String(userData.city).trim().toLowerCase();
    if (userData.state)        clean.state        = String(userData.state).trim().toLowerCase();
    if (userData.zip)          clean.zip          = String(userData.zip).replace(/\D/g, '');
    if (userData.country)      clean.country      = String(userData.country).trim().toLowerCase();
    if (userData.external_id)  clean.external_id  = String(userData.external_id).trim();
    Object.assign(IDENTITY, clean);
    try { ssSet('identity', JSON.stringify(IDENTITY)); } catch (e) {}
    // TikTok identify client-side
    try {
      if (window.ttq && window.ttq.identify) {
        var tt = {};
        if (clean.email)      tt.email        = clean.email;
        if (clean.phone)      tt.phone_number = clean.phone;
        if (clean.first_name) tt.first_name   = clean.first_name;
        if (clean.last_name)  tt.last_name    = clean.last_name;
        if (clean.city)       tt.city         = clean.city;
        if (clean.state)      tt.state        = clean.state;
        if (clean.zip)        tt.zip_code     = clean.zip;
        if (clean.country)    tt.country      = clean.country;
        if (clean.external_id) tt.external_id = clean.external_id;
        if (Object.keys(tt).length) window.ttq.identify(tt);
      }
    } catch (e) {}
  }
  // Restaura identity persistida
  try {
    var saved = ssGet('identity');
    if (saved) IDENTITY = JSON.parse(saved);
  } catch (e) {}

  // ─── 4. event_id ──────────────────────────────────────────────────────
  function getEventId() {
    var id = ssGet('event_id');
    if (!id) { id = uuid(); ssSet('event_id', id); }
    return id;
  }

  // ─── 5. fire ──────────────────────────────────────────────────────────
  function fireClientPixel(eventName, params, eventId) {
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', eventName, params || {}, { eventID: eventId });
      }
    } catch (e) {}
    try {
      if (window.ttq && window.ttq.track) {
        window.ttq.track(eventName, params || {}, { event_id: eventId });
      }
    } catch (e) {}
  }

  function fireServer(endpoint, eventName, params, eventId, extras) {
    var values = getValues();
    var pii = Object.assign({}, IDENTITY, extras || {});
    var payload = {
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: window.location.href,
      referrer_url: document.referrer || null,
      pixel_id: PIXEL_ID,
      tiktok_pixel_id: TT_PIXEL,
      user_data: {
        client_user_agent: navigator.userAgent,
        fbp: values._fbp || null,
        fbc: values._fbc || null,
        ttp: values._ttp || null,
        fbclid: values.fbclid || null,
        ttclid: values.ttclid || null,
        gclid: values.gclid || null,
        email: pii.email || null,
        phone: pii.phone || null,
        first_name: pii.first_name || null,
        last_name: pii.last_name || null,
        city: pii.city || null,
        state: pii.state || null,
        zip: pii.zip || null,
        country: pii.country || null,
        external_id: pii.external_id || null
      },
      custom_data: Object.assign({}, params || {}, {
        utms: {
          source:   values.utm_source   || null,
          medium:   values.utm_medium   || null,
          campaign: values.utm_campaign || null,
          content:  values.utm_content  || null,
          term:     values.utm_term     || null
        },
        adapter: ADAPTER.name,
        affiliate: {
          src: values.src || null, sck: values.sck || null, xcod: values.xcod || null,
          tid: values.tid || null, hop: values.hop || null, ref: values.ref || null
        }
      })
    };
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body, keepalive: true
        }).catch(function () {});
      }
    } catch (e) {}
  }

  // ─── 6. tracker.event (público) ──────────────────────────────────────
  function trackEvent(eventName, params, extras) {
    params = params || {};
    // Cálculo automático de comissão pro Purchase
    if (eventName === 'Purchase' && params.gross_price && !params.value) {
      params.value = +(params.gross_price * COMMISSION).toFixed(2);
      if (!params.currency) params.currency = 'BRL';
    }
    // Expansão de content_ids → contents[] usando catálogo do config
    if (params.content_ids && !params.contents) {
      params.contents = params.content_ids.map(function (id) {
        var p = PRODUCTS[id] || {};
        return {
          content_id: p.id || id,
          content_name: p.name || id,
          content_type: 'product',
          quantity: 1,
          price: p.price || 0
        };
      });
    }
    var eventId = (eventName === 'PageView') ? getEventId() : uuid();
    fireClientPixel(eventName, params, eventId);
    if (PIXEL_ID)  fireServer('/api/track',         eventName, params, eventId, extras);
    if (TT_PIXEL)  fireServer('/api/track-tiktok',  eventName, params, eventId, extras);
    return eventId;
  }

  // ─── 7. propagate to checkout ────────────────────────────────────────
  function buildQS(values) {
    var parts = Object.keys(values).filter(function (k) {
      return values[k] && KEYS.indexOf(k) >= 0;
    }).map(function (k) {
      var mapped = (ADAPTER.paramMap && ADAPTER.paramMap[k]) || k;
      return encodeURIComponent(mapped) + '=' + encodeURIComponent(values[k]);
    });
    // event_id sempre vai junto — webhook do postback usa pra casar venda ↔ clique
    var eid = getEventId();
    var eidName = (ADAPTER.paramMap && ADAPTER.paramMap.event_id) || 'event_id';
    parts.push(encodeURIComponent(eidName) + '=' + encodeURIComponent(eid));
    return parts.join('&');
  }
  function isCheckoutUrl(url) {
    if (!url || !ADAPTER.checkoutDomains) return false;
    try {
      var u = new URL(url, window.location.href);
      return ADAPTER.checkoutDomains.some(function (d) {
        return u.hostname === d || u.hostname.endsWith('.' + d);
      });
    } catch (e) { return false; }
  }
  function hookLinks() {
    try {
      var values = getValues();
      var qs = buildQS(values);
      document.querySelectorAll('a[href]').forEach(function (a) {
        var href = a.getAttribute('href');
        if (!href || !isCheckoutUrl(href)) return;
        // Auto InitiateCheckout no clique
        if (AUTO.InitiateCheckout && !a.dataset.fnlIcHooked) {
          a.addEventListener('click', function () {
            trackEvent('InitiateCheckout', { content_type: 'product' });
          }, { capture: true });
          a.dataset.fnlIcHooked = '1';
        }
        if (qs && a.dataset.fnlTracked !== '1') {
          var sep = href.indexOf('?') >= 0 ? '&' : '?';
          a.setAttribute('href', href + sep + qs);
          a.dataset.fnlTracked = '1';
        }
      });
    } catch (e) {}
  }
  function hookForms() {
    try {
      var values = getValues();
      document.querySelectorAll('form[action]').forEach(function (form) {
        if (!isCheckoutUrl(form.getAttribute('action'))) return;
        if (form.dataset.fnlTracked === '1') return;
        Object.keys(values).forEach(function (k) {
          if (!values[k] || KEYS.indexOf(k) < 0) return;
          var name = (ADAPTER.paramMap && ADAPTER.paramMap[k]) || k;
          if (form.querySelector('input[name="' + name + '"]')) return;
          var input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = values[k];
          form.appendChild(input);
        });
        form.dataset.fnlTracked = '1';
      });
    } catch (e) {}
  }

  // ─── public API ──────────────────────────────────────────────────────
  window.tracker = {
    event: trackEvent,
    identify: identify,
    getValues: getValues,
    getEventId: getEventId
  };

  // ─── boot ────────────────────────────────────────────────────────────
  loadTikTokPixel();
  harvest();
  trackEvent('PageView');
  if (AUTO.ViewContent) {
    // ViewContent auto (após PageView). Pega content_name do <title>.
    setTimeout(function () {
      trackEvent('ViewContent', {
        content_name: (document.title || '').trim().slice(0, 120),
        content_category: CFG.content_category || null
      });
    }, 50);
  }

  function applyHooks() {
    hookLinks();
    hookForms();
    if (typeof ADAPTER.onApply === 'function') {
      try { ADAPTER.onApply(getValues()); } catch (e) {}
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHooks);
  } else {
    applyHooks();
  }
  var ticks = 0;
  var iv = setInterval(function () {
    ticks++;
    applyHooks();
    if (ticks >= 6) clearInterval(iv);
  }, 5000);
})();
