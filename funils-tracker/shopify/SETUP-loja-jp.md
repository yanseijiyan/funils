# SETUP — tenant `loja-jp` (Shopify + TikTok)

Runbook dos passos que faltam pra ativar o tracking da loja Shopify.
Etapas 1 e 2 já estão feitas (código + tenant). Faça da 3 em diante quando
tiver os tokens e a loja no ar.

| Etapa | O que falta | Bloqueado por |
|-------|-------------|---------------|
| 1. Webhook implementado | ✅ feito | — |
| 2. Tenant `loja-jp` no `tenants.json` | ✅ feito | — |
| 3. Envs no Vercel | ⏳ | token TikTok |
| 4. BB BRIDGE no `theme.liquid` | ⏳ | loja Shopify |
| 5. Webhook no Shopify Admin | ⏳ | loja Shopify |
| 6. Embed do bridge no funil | ⏳ | — (dá pra fazer já) |
| 7. Custom Pixels no Shopify | ⏳ | loja Shopify |
| 8. Teste end-to-end | ⏳ | tudo acima |

---

## ETAPA 3 — Envs no Vercel

Pré: ter o **TikTok Pixel ID** + **Access Token** (TikTok Events Manager →
Settings → Events API → Generate Access Token).

1. Preencher o Pixel ID no `tenants.json` (campo `tiktok_pixel_id` do `loja-jp`).
2. Setar o token (rode você mesmo — não cola token em chat):

```bash
cd ~/funils/funils-tracker
vercel env add        # Nome: TENANT_LOJAJP_TIKTOK_ACCESS_TOKEN
                      # Valor: <Access Token TikTok> · Production · sensitive: yes
```

> `TENANT_LOJAJP_SHOPIFY_WEBHOOK_SECRET` é setada na Etapa 5 (vem do Shopify).
> Meta fica pra depois — quando rodar Meta Ads, setar `TENANT_LOJAJP_CAPI_TOKEN`
> e preencher `meta_pixel_id` no `tenants.json`.

3. Redeploy: `vercel deploy --prod --yes` (envs só valem em deploy novo).

---

## ETAPA 4 — BB BRIDGE no `theme.liquid`

1. Shopify Admin → **Online Store → Themes → Edit code**.
2. Abre `layout/theme.liquid`.
3. Cola o conteúdo de `shopify/theme-liquid-bridge.liquid` **logo antes de `</body>`**.
4. Salva.

---

## ETAPA 5 — Webhook no Shopify Admin

1. Shopify Admin → **Settings → Notifications → Webhooks** → **Create webhook**.
2. Configura:
   - **Event:** `Order creation`
   - **Format:** JSON
   - **URL:** `https://funils-tracker.vercel.app/api/webhook/shopify?tenant=loja-jp`
3. Salva. O Shopify mostra um **Signing secret** no rodapé da página de webhooks.
4. Copia esse secret e seta a env:

```bash
cd ~/funils/funils-tracker
vercel env add        # Nome: TENANT_LOJAJP_SHOPIFY_WEBHOOK_SECRET
                      # Valor: <Signing secret do Shopify> · Production · sensitive: yes
vercel deploy --prod --yes
```

> Sem o secret correto, o webhook responde `401 invalid_hmac`.
> Preencher também `shopify_domain` no `tenants.json` (ex.: `loja-jp.myshopify.com`).

---

## ETAPA 6 — Embed do bridge no funil

No `<head>` (ou antes de `</body>`) das páginas do funil que mandam tráfego
pra loja (cliente-2, cliente-3, ...):

```html
<script src="https://funils-tracker.vercel.app/bridge/core.js"
        data-tenant="loja-jp"
        data-tiktok-pixel="<TIKTOK_PIXEL_ID>"
        data-platform="shopify"
        data-shopify-domain="<dominio-da-loja.com>"
        defer></script>
```

`data-shopify-domain` faz o adapter propagar `ttclid`/`utm_*` nos links que
apontam pra loja.

---

## ETAPA 7 — Custom Pixels no Shopify

Shopify Admin → **Settings → Customer Events → Add custom pixel**.
Criar um pixel TikTok (`ttq.load` + `identify` + subscribe nos eventos de
checkout) e dar **Connect/Enable** no toggle. (fbq não funciona no sandbox da
Shopify — Meta vai via servidor: `/api/capi/event`.)

---

## ETAPA 8 — Teste end-to-end

1. Pedido de teste na loja (ou Shopify Admin → webhook → **Send test notification**).
2. Conferir logs: `vercel logs https://funils-tracker.vercel.app --json | grep shopify | tail -5`
   — procurar `"ok":true` e `"event":"Purchase"`.
3. TikTok Events Manager → o `CompletePayment` deve aparecer como **Server**.

---

## Referência rápida — `loja-jp`

| Item | Valor |
|------|-------|
| Webhook URL | `https://funils-tracker.vercel.app/api/webhook/shopify?tenant=loja-jp` |
| Env token TikTok | `TENANT_LOJAJP_TIKTOK_ACCESS_TOKEN` |
| Env secret Shopify | `TENANT_LOJAJP_SHOPIFY_WEBHOOK_SECRET` |
| Env Meta (futuro) | `TENANT_LOJAJP_CAPI_TOKEN` |
| Embed bridge | `https://funils-tracker.vercel.app/bridge/core.js` |
| Tópicos webhook | `orders/create`, `orders/paid` → Purchase · `refunds/create` → Refund |
