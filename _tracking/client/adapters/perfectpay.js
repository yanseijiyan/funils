/* adapter: perfectpay
 * Perfectpay aceita utm_* nativos.
 */
(function () {
  window._tracking = window._tracking || {};
  window._tracking.adapter = {
    name: 'perfectpay',
    checkoutDomains: [
      'perfectpay.com.br',
      'pay.perfectpay.com.br',
      'app.perfectpay.com.br',
      'go.perfectpay.com.br'
    ],
    paramMap: {
      utm_source:   'utm_source',
      utm_medium:   'utm_medium',
      utm_campaign: 'utm_campaign',
      utm_content:  'utm_content',
      utm_term:     'utm_term',
      fbclid: 'fbclid', ttclid: 'ttclid', gclid: 'gclid',
      src: 'src', sck: 'sck',
      // event_id viaja como param custom — PerfectPay devolve no postback
      event_id: 'event_id'
    }
  };
})();
