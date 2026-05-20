/* funils-tracker bridge — core client-side servido como CDN
 *
 * Embed:
 *   <script src="https://funils-tracker.vercel.app/bridge/core.js"
 *           data-tenant="cliente-4"
 *           data-meta-pixel="1234567890"
 *           data-tiktok-pixel="D8234JJC..."
 *           data-platform="perfectpay"
 *           data-commission-rate="1"
 *           data-auto-view-content="true"
 *           defer></script>
 *
 * O que faz:
 *  1. Lê config dos data-* do próprio <script>
 *  2. Auto-carrega Meta Pixel + TikTok Pixel client-side
 *  3. Carrega adapter dinâmicamente (bridge/adapters/<platform>.js)
 *  4. Harvest UTMs/click_ids → persist (session+local+cookie)
 *  5. Auto-dispara PageView, ViewContent (opt-out), InitiateCheckout (no clique)
 *  6. Adapter hooka <a>/<form> pro checkout externo, propaga UTMs+event_id
 *  7. POST pra <origin>/api/capi/event (dispara Meta CAPI + TikTok Events server-side)
 *
 * Public API: window.tracker.event / identify / getValues / getEventId
 */
(function () {
  'use strict';

  /* ── descoberta de origem do tracker (pra montar URL dos endpoints) ── */
  function findScript() {
    return document.currentScript
        || document.querySelector('script[src*="/bridge/core.js"]')
        || null;
  }
  var SCRIPT = findScript();
  var ORIGIN = (SCRIPT && SCRIPT.src) ? new URL(SCRIPT.src).origin : location.origin;
  var DS = SCRIPT ? SCRIPT.dataset : {};

  /* ── config ── */
  var CFG = {
    tenant:           DS.tenant || null,
    meta_pixel:       DS.metaPixel || null,
    tiktok_pixel:     DS.tiktokPixel || null,
    platform:         DS.platform || null,
    commission_rate:  DS.commissionRate ? parseFloat(DS.commissionRate) : 1,
    content_category: DS.contentCategory || null,
    auto_view_content:    DS.autoViewContent !== 'false',
    auto_initiate_checkout: DS.autoInitiateCheckout !== 'false',
    auto_meta_pixel:      DS.autoMetaPixel !== 'false',
    auto_tiktok_pixel:    DS.autoTiktokPixel !== 'false'
  };

  if (!CFG.tenant) { console.warn('[funils-tracker] data-tenant é obrigatório'); return; }

  var STORAGE_PREFIX = 'fnl_';
  var COOKIE_DAYS = 90;
  var KEYS = [
    'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
    'fbclid','ttclid','gclid','msclkid',
    'src','sck','xcod','tid','vtid','hop','aff','affid','ref'
  ];

  /* ── utils ── */
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

  /* ── Meta Pixel auto-load ── */
  function loadMetaPixel() {
    if (!CFG.auto_meta_pixel || !CFG.meta_pixel || typeof window.fbq === 'function') return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CFG.meta_pixel);
  }

  /* ── TikTok Pixel auto-load ── */
  function loadTikTokPixel() {
    if (!CFG.auto_tiktok_pixel || !CFG.tiktok_pixel || typeof window.ttq !== 'undefined') return;
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
      ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) { var e = ttq._i[t] || []; for (var n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
      ttq.load = function (e, n) {
        var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i;
        ttq._t = ttq._t || {}; ttq._t[e] = +new Date;
        ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        var o = document.createElement('script'); o.type = 'text/javascript'; o.async = !0;
        o.src = i + '?sdkid=' + e + '&lib=' + t;
        var a = document.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a);
      };
      ttq.load(CFG.tiktok_pixel); ttq.page();
    }(window, document, 'ttq');
  }

  /* ── harvest URL → persist ── */
  function harvest() {
    try {
      var p = new URLSearchParams(location.search);
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

  /* ── identify ── */
  var IDENTITY = {};
  try {
    var saved = ssGet('identity');
    if (saved) IDENTITY = JSON.parse(saved);
  } catch (e) {}
  function identify(ud) {
    if (!ud) return;
    var clean = {};
    ['email','phone','first_name','last_name','city','state','zip','country','external_id'].forEach(function (k) {
      if (ud[k]) clean[k] = String(ud[k]).trim();
    });
    if (clean.email) clean.email = clean.email.toLowerCase();
    if (clean.phone) clean.phone = clean.phone.replace(/\D/g, '');
    if (clean.zip)   clean.zip   = clean.zip.replace(/\D/g, '');
    Object.assign(IDENTITY, clean);
    try { ssSet('identity', JSON.stringify(IDENTITY)); } catch (e) {}
    /* TikTok identify client-side */
    try {
      if (window.ttq && window.ttq.identify) {
        var tt = {};
        if (clean.email) tt.email = clean.email;
        if (clean.phone) tt.phone_number = clean.phone;
        if (clean.first_name) tt.first_name = clean.first_name;
        if (clean.last_name)  tt.last_name  = clean.last_name;
        if (clean.city)  tt.city = clean.city;
        if (clean.state) tt.state = clean.state;
        if (clean.zip)   tt.zip_code = clean.zip;
        if (clean.country) tt.country = clean.country;
        if (clean.external_id) tt.external_id = clean.external_id;
        if (Object.keys(tt).length) window.ttq.identify(tt);
      }
    } catch (e) {}
  }

  /* ── event_id ── */
  function getEventId() {
    var id = ssGet('event_id');
    if (!id) { id = uuid(); ssSet('event_id', id); }
    return id;
  }

  /* ── session_id ── (agrupa eventos do mesmo visitor pro dashboard) ── */
  function getSessionId() {
    var sid = lsGet('session_id');
    if (!sid) { sid = uuid(); lsSet('session_id', sid); setCookie('session_id', sid); }
    return sid;
  }

  /* ── fire ── */
  function fireClient(eventName, params, eventId) {
    try { if (window.fbq) window.fbq('track', eventName, params || {}, { eventID: eventId }); } catch (e) {}
    try { if (window.ttq && window.ttq.track) window.ttq.track(eventName, params || {}, { event_id: eventId }); } catch (e) {}
  }

  function fireServer(eventName, params, eventId, extras) {
    var values = getValues();
    var pii = Object.assign({}, IDENTITY, extras || {});
    var payload = {
      tenant: CFG.tenant,
      session_id: getSessionId(),
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: location.href,
      referrer_url: document.referrer || null,
      user_data: {
        client_user_agent: navigator.userAgent,
        fbp: values._fbp || null, fbc: values._fbc || null, ttp: values._ttp || null,
        fbclid: values.fbclid || null, ttclid: values.ttclid || null, gclid: values.gclid || null,
        email: pii.email || null, phone: pii.phone || null,
        first_name: pii.first_name || null, last_name: pii.last_name || null,
        city: pii.city || null, state: pii.state || null,
        zip: pii.zip || null, country: pii.country || null,
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
        platform: CFG.platform,
        content_category: params && params.content_category || CFG.content_category || null,
        affiliate: {
          src: values.src || null, sck: values.sck || null, xcod: values.xcod || null,
          tid: values.tid || null, hop: values.hop || null, ref: values.ref || null
        }
      })
    };
    var url = ORIGIN + '/api/capi/event';
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
          .catch(function () {});
      }
    } catch (e) {}
  }

  function trackEvent(eventName, params, extras) {
    params = params || {};
    /* Comissão automática pro Purchase */
    if (eventName === 'Purchase' && params.gross_price && !params.value) {
      params.value = +(params.gross_price * CFG.commission_rate).toFixed(2);
      if (!params.currency) params.currency = 'BRL';
    }
    var eventId = (eventName === 'PageView') ? getEventId() : uuid();
    fireClient(eventName, params, eventId);
    fireServer(eventName, params, eventId, extras);
    return eventId;
  }

  /* ── hook checkout (delega pro adapter) ── */
  function buildQS(adapter, values) {
    var parts = Object.keys(values).filter(function (k) {
      return values[k] && KEYS.indexOf(k) >= 0;
    }).map(function (k) {
      var mapped = (adapter.paramMap && adapter.paramMap[k]) || k;
      return encodeURIComponent(mapped) + '=' + encodeURIComponent(values[k]);
    });
    var eidName = (adapter.paramMap && adapter.paramMap.event_id) || 'event_id';
    parts.push(encodeURIComponent(eidName) + '=' + encodeURIComponent(getEventId()));
    return parts.join('&');
  }
  function isCheckoutUrl(adapter, url) {
    if (!url || !adapter.checkoutDomains) return false;
    try {
      var u = new URL(url, location.href);
      return adapter.checkoutDomains.some(function (d) {
        return u.hostname === d || u.hostname.endsWith('.' + d);
      });
    } catch (e) { return false; }
  }
  function applyHooks(adapter) {
    if (!adapter) return;
    var values = getValues();
    var qs = buildQS(adapter, values);
    try {
      document.querySelectorAll('a[href]').forEach(function (a) {
        var href = a.getAttribute('href');
        if (!href || !isCheckoutUrl(adapter, href)) return;
        if (CFG.auto_initiate_checkout && !a.dataset.fnlIcHooked) {
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
    try {
      document.querySelectorAll('form[action]').forEach(function (form) {
        if (!isCheckoutUrl(adapter, form.getAttribute('action'))) return;
        if (form.dataset.fnlTracked === '1') return;
        Object.keys(values).forEach(function (k) {
          if (!values[k] || KEYS.indexOf(k) < 0) return;
          var name = (adapter.paramMap && adapter.paramMap[k]) || k;
          if (form.querySelector('input[name="' + name + '"]')) return;
          var input = document.createElement('input');
          input.type = 'hidden'; input.name = name; input.value = values[k];
          form.appendChild(input);
        });
        form.dataset.fnlTracked = '1';
      });
    } catch (e) {}
    if (typeof adapter.onApply === 'function') {
      try { adapter.onApply(values); } catch (e) {}
    }
  }

  /* ── auto-trackers de funil ─────────────────────────────────────────
   * Atribui eventos sem precisar de código no HTML:
   *  - VSL milestones (player HTML5 <video>): VSLPlay, VSL_25, VSL_50, VSL_75
   *  - ScrollDepth: ScrollDepth_50, _75, _100
   *  - Quiz: API manual (window.tracker.event('QuizStep', { step: 5 }))
   *
   * Pra desligar:
   *   data-auto-vsl="false"
   *   data-auto-scroll="false"
   */
  function setupVslTracking() {
    if (DS.autoVsl === 'false') return;
    function hookVideo(v) {
      if (v.dataset.fnlVslHooked === '1') return;
      v.dataset.fnlVslHooked = '1';
      var fired = {};
      v.addEventListener('play', function () {
        if (fired.play) return;
        fired.play = true;
        trackEvent('VSLPlay', { src: v.currentSrc || v.src || null });
      });
      v.addEventListener('timeupdate', function () {
        if (!v.duration || isNaN(v.duration)) return;
        var pct = v.currentTime / v.duration;
        [25, 50, 75].forEach(function (m) {
          if (pct >= m / 100 && !fired[m]) {
            fired[m] = true;
            trackEvent('VSL_' + m, { pct: m, src: v.currentSrc || v.src || null });
          }
        });
      });
      v.addEventListener('ended', function () {
        if (fired.end) return;
        fired.end = true;
        trackEvent('VSL_100', { pct: 100, src: v.currentSrc || v.src || null });
      });
    }
    document.querySelectorAll('video').forEach(hookVideo);
    /* Observer pra vídeos que renderizam tarde (SPA/VSL com placeholder) */
    try {
      var obs = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.tagName === 'VIDEO') hookVideo(n);
            if (n.querySelectorAll) n.querySelectorAll('video').forEach(hookVideo);
          });
        });
      });
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  function setupScrollTracking() {
    if (DS.autoScroll === 'false') return;
    var hits = {};
    function check() {
      var h = document.documentElement;
      var max = Math.max(h.scrollHeight, document.body.scrollHeight || 0);
      if (max <= 0) return;
      var pct = ((window.scrollY || h.scrollTop || 0) + window.innerHeight) / max * 100;
      [50, 75, 100].forEach(function (m) {
        if (pct >= m && !hits[m]) {
          hits[m] = true;
          trackEvent('ScrollDepth_' + m, { pct: m });
        }
      });
    }
    var rafScheduled = false;
    window.addEventListener('scroll', function () {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(function () { rafScheduled = false; check(); });
    }, { passive: true });
  }

  /* ── public API ── */
  window.tracker = {
    event: trackEvent,
    identify: identify,
    getValues: getValues,
    getEventId: getEventId,
    getSessionId: getSessionId,
    config: CFG
  };

  /* ── boot ── */
  loadMetaPixel();
  loadTikTokPixel();
  harvest();
  trackEvent('PageView');
  if (CFG.auto_view_content) {
    setTimeout(function () {
      trackEvent('ViewContent', { content_name: (document.title || '').trim().slice(0, 120) });
    }, 50);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setupVslTracking();
      setupScrollTracking();
    });
  } else {
    setupVslTracking();
    setupScrollTracking();
  }

  /* ── carrega adapter dinâmicamente, depois aplica hooks (com re-tick) ── */
  function bootAdapter() {
    if (!CFG.platform) return;
    var s = document.createElement('script');
    s.src = ORIGIN + '/bridge/adapters/' + CFG.platform + '.js';
    s.async = true;
    s.onload = function () {
      var adapter = window._fnlAdapter;
      function runHooks() { applyHooks(adapter); }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runHooks);
      } else {
        runHooks();
      }
      /* Re-tick — cobre VSL/quiz que renderiza botão tarde */
      var ticks = 0;
      var iv = setInterval(function () {
        ticks++;
        runHooks();
        if (ticks >= 6) clearInterval(iv);
      }, 5000);
    };
    s.onerror = function () { console.warn('[funils-tracker] adapter "' + CFG.platform + '" não carregou — sem hookagem de checkout'); };
    document.head.appendChild(s);
  }
  bootAdapter();
})();
