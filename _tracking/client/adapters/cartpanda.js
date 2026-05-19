/* adapter: cartpanda
 * Cartpanda usa utm_* nativos. Suporta `attributes[xxx]` no checkout (similar Shopify).
 */
(function () {
  window._tracking = window._tracking || {};
  window._tracking.adapter = {
    name: 'cartpanda',
    checkoutDomains: [
      'cartpanda.com',
      'pay.cartpanda.com',
      'checkout.cartpanda.com',
      'cartx.io'
    ],
    paramMap: {
      utm_source:   'utm_source',
      utm_medium:   'utm_medium',
      utm_campaign: 'utm_campaign',
      utm_content:  'utm_content',
      utm_term:     'utm_term',
      fbclid: 'fbclid', ttclid: 'ttclid', gclid: 'gclid'
    }
  };
})();
