/* adapter: clickbank
 * Clickbank tem parâmetros próprios:
 *   - hop: hoplink do afiliado (já vem no link, NÃO sobrescrever)
 *   - tid: tracking ID custom (USE pra passar UTM info — vai pro pixel postback)
 *   - vtid: vendor tracking ID
 * Como o `tid` cabe só 1 valor, concatenamos utm_source+utm_campaign nele.
 */
(function () {
  window._tracking = window._tracking || {};
  window._tracking.adapter = {
    name: 'clickbank',
    checkoutDomains: [
      'clickbank.net',
      'cbpurchase.com',
      'products.clickbank.com',
      'paypal.clickbank.net'
    ],
    paramMap: {
      // Click IDs viajam diretos (caso o vendor exponha no postback)
      fbclid: 'fbclid', ttclid: 'ttclid', gclid: 'gclid',
      tid: 'tid', vtid: 'vtid'
    },
    onApply: function (values) {
      // Compõe tid a partir de utm_source+utm_campaign se ainda não tiver tid explícito
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
})();
