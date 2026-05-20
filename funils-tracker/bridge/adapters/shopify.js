/* adapter: shopify
 *
 * Hooka <a>/<form> do funil que apontam pra loja Shopify e propaga
 * UTMs + click_ids (ttclid/fbclid/gclid) + event_id na URL.
 *
 * O domínio da loja Shopify é custom (não dá pra hardcodar), então é lido
 * do <script> do core via data-shopify-domain (ou data-checkout-domain):
 *
 *   <script src=".../bridge/core.js"
 *           data-tenant="minha-loja"
 *           data-tiktok-pixel="..."
 *           data-platform="shopify"
 *           data-shopify-domain="minhaloja.com"
 *           defer></script>
 *
 * No lado da Shopify, o snippet "BB TRACKER BRIDGE" no theme.liquid lê
 * esses params da URL e persiste em cart.attributes → viram note_attributes
 * no pedido → o webhook /api/webhook/shopify recupera pra atribuição.
 */
(function () {
  function clean(d) {
    return String(d || '')
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '')
      .toLowerCase();
  }

  var core = document.currentScript
    || document.querySelector('script[src*="/bridge/core.js"]');
  var ds = core ? core.dataset : {};

  var domains = ['myshopify.com'];
  [ds.shopifyDomain, ds.checkoutDomain].forEach(function (d) {
    var c = clean(d);
    if (c && domains.indexOf(c) < 0) domains.push(c);
  });

  window._fnlAdapter = {
    name: 'shopify',
    checkoutDomains: domains,
    paramMap: {
      utm_source:   'utm_source',
      utm_medium:   'utm_medium',
      utm_campaign: 'utm_campaign',
      utm_content:  'utm_content',
      utm_term:     'utm_term',
      fbclid: 'fbclid',
      ttclid: 'ttclid',
      gclid:  'gclid',
      event_id: 'event_id'
    }
  };
})();
