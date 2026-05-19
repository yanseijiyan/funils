/* adapter: kiwify
 * Kiwify aceita utm_* nativos e propaga pro postback automaticamente.
 * Click IDs viajam como query genérica (visíveis no detalhe da venda).
 */
(function () {
  window._tracking = window._tracking || {};
  window._tracking.adapter = {
    name: 'kiwify',
    checkoutDomains: [
      'checkout.kiwify.com.br',
      'pay.kiwify.com.br',
      'pay.kiwify.com',
      'kiwify.com.br',
      'kiwify.com'
    ],
    paramMap: {
      utm_source:   'utm_source',
      utm_medium:   'utm_medium',
      utm_campaign: 'utm_campaign',
      utm_content:  'utm_content',
      utm_term:     'utm_term',
      fbclid: 'fbclid', ttclid: 'ttclid', gclid: 'gclid',
      src: 'src', sck: 'sck'
    }
  };
})();
