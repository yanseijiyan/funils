/* adapter: clickbank */
window._fnlAdapter = {
  name: 'clickbank',
  checkoutDomains: [
    'clickbank.net', 'cbpurchase.com',
    'products.clickbank.com', 'paypal.clickbank.net'
  ],
  paramMap: {
    fbclid: 'fbclid', ttclid: 'ttclid', gclid: 'gclid',
    tid: 'tid', vtid: 'vtid'
  },
  onApply: function (values) {
    try {
      if (values.tid) return;
      var src = values.utm_source || values.src || '';
      var camp = values.utm_campaign || '';
      var content = values.utm_content || '';
      var tid = [src, camp, content].filter(Boolean).join('_').slice(0, 24);
      if (!tid) return;
      document.querySelectorAll('a[href*="hop="], a[href*="clickbank.net"], a[href*="cbpurchase.com"]')
        .forEach(function (a) {
          var href = a.getAttribute('href');
          if (!href || href.indexOf('tid=') >= 0) return;
          var sep = href.indexOf('?') >= 0 ? '&' : '?';
          a.setAttribute('href', href + sep + 'tid=' + encodeURIComponent(tid));
        });
    } catch (e) {}
  }
};
