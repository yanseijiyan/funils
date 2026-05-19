/* adapter: hotmart
 * Hotmart aceita utm_* nativos + src/sck/xcod (parâmetros próprios de atribuição).
 * Click IDs (fbclid/ttclid/gclid) viajam como query genérica — recuperáveis via API de purchase.
 * Carregue ESTE arquivo ANTES do core.js.
 */
(function () {
  window._tracking = window._tracking || {};
  window._tracking.adapter = {
    name: 'hotmart',
    checkoutDomains: [
      'pay.hotmart.com',
      'go.hotmart.com',
      'hotmart.com',
      'hotmart.com.br',
      'click.hotmart.com'
    ],
    paramMap: {
      utm_source:   'utm_source',
      utm_medium:   'utm_medium',
      utm_campaign: 'utm_campaign',
      utm_content:  'utm_content',
      utm_term:     'utm_term',
      // Hotmart-native (use src pra source da venda — aparece no painel)
      src:          'src',
      sck:          'sck',
      xcod:         'xcod',
      // click_ids genéricos
      fbclid: 'fbclid', ttclid: 'ttclid', gclid: 'gclid'
    }
  };
})();
