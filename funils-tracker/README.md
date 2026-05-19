# funils-tracker

Tracker central multi-tenant que substitui Utmify/Hyros. **1 projeto Vercel serve N funis e N lojas Shopify** — você adiciona um tenant no `tenants.json`, configura envs no Vercel, e cola um `<script>` no site.

Cobre: Meta Pixel + Meta CAPI server-side, TikTok Pixel + TikTok Events API server-side, webhook PerfectPay (Purchase/Refund), webhooks Hotmart/Kiwify/Shopify (TODO), adapters por plataforma de checkout (hotmart/kiwify/cartpanda/clickbank/perfectpay).

## Arquitetura

```
funils-tracker.vercel.app/
├── tenants.json                ← config pública por tenant (pixel_ids, plataforma, produtos)
├── api/
│   ├── capi/
│   │   ├── event               ← endpoint unificado: Meta CAPI + TikTok Events numa só call
│   │   ├── meta                ← só Meta CAPI
│   │   └── tiktok              ← só TikTok Events
│   └── webhook/
│       ├── perfectpay          ← ✅ multi-tenant
│       ├── hotmart             ← TODO
│       ├── kiwify              ← TODO
│       └── shopify             ← TODO
├── bridge/                     ← servido como CDN estático (cache 1h browser, 24h edge)
│   ├── core.js                 ← script único pro embed
│   └── adapters/<plataforma>.js
└── lib/                        ← código compartilhado (importado pelas Functions)
    ├── tenant.js               ← resolve tenant_id → config
    ├── hash.js                 ← SHA256 PII
    ├── meta-capi.js
    └── tiktok-events.js
```

## Adicionar um tenant novo (passo a passo)

### 1. Adiciona entrada no `tenants.json`
```jsonc
{
  "meu-funil-x": {
    "meta_pixel_id": "1234567890",
    "tiktok_pixel_id": "D8234JJC...",
    "platform": "perfectpay",
    "commission_rate": 1.0,
    "content_category": "info-product",
    "products": {
      "produto-x": { "id": "PP123", "name": "Produto X", "price": 197 }
    }
  }
}
```

### 2. Seta as envs no Vercel
Naming convention: `TENANT_<NOME_UPPER_SEM_DASHES>_<TIPO>`.
Pro tenant `meu-funil-x` → prefix `TENANT_MEUFUNILX_`:

```bash
vercel env add TENANT_MEUFUNILX_CAPI_TOKEN production
vercel env add TENANT_MEUFUNILX_TIKTOK_ACCESS_TOKEN production
vercel env add TENANT_MEUFUNILX_PERFECTPAY_TOKEN production   # se for usar webhook
# opcionais:
vercel env add TENANT_MEUFUNILX_CAPI_TEST_CODE production
vercel env add TENANT_MEUFUNILX_TIKTOK_TEST_CODE production
```

Fallback: se uma env `TENANT_<NOME>_X` não existir, o tracker usa `DEFAULT_X` (útil quando vários tenants compartilham token).

### 3. Cola o `<script>` no site (1 linha)
```html
<script src="https://funils-tracker.vercel.app/bridge/core.js"
        data-tenant="meu-funil-x"
        data-meta-pixel="1234567890"
        data-tiktok-pixel="D8234JJC..."
        data-platform="perfectpay"
        data-commission-rate="1"
        defer></script>
```

Atributos:
| Atributo | Obrigatório | O que faz |
|---|---|---|
| `data-tenant` | ✅ | identifica tenant pro server |
| `data-meta-pixel` | recomendado | Pixel ID Meta (carrega automático) |
| `data-tiktok-pixel` | recomendado | Pixel ID TikTok (carrega automático) |
| `data-platform` | recomendado | hotmart/kiwify/cartpanda/clickbank/perfectpay |
| `data-commission-rate` | opcional | default 1 (100%). Pra afiliado: 0.5 etc |
| `data-content-category` | opcional | tag de categoria pra todos os eventos |
| `data-auto-view-content` | opcional | "false" desliga ViewContent automático |
| `data-auto-initiate-checkout` | opcional | "false" desliga InitiateCheckout no clique |
| `data-auto-meta-pixel` | opcional | "false" pra não auto-carregar Meta Pixel |
| `data-auto-tiktok-pixel` | opcional | "false" pra não auto-carregar TikTok Pixel |

### 4. (Opcional) Webhook PerfectPay
No painel PerfectPay → Configurações → Notificações:
- **URL**: `https://funils-tracker.vercel.app/api/webhook/perfectpay?tenant=meu-funil-x`
- **Token**: o MESMO valor de `TENANT_MEUFUNILX_PERFECTPAY_TOKEN`
- **Eventos**: Venda Aprovada, Reembolso, Boleto Pago, Pix Pago

## API pública (`window.tracker`)

```js
tracker.event(name, params?, extras?)
tracker.identify({email, phone, first_name, last_name, city, state, zip, country, external_id})
tracker.getValues()                          // debug — UTMs/click_ids capturados
tracker.getEventId()                         // PageView event_id da sessão
tracker.config                               // config carregada do data-*
```

Eventos auto-disparados: `PageView`, `ViewContent` (após PageView), `InitiateCheckout` (clique em link de checkout).

Eventos manuais:
```html
<button onclick="tracker.event('Lead', {content_name: 'optin-vsl'})">Quero saber mais</button>
<script>tracker.event('Purchase', {gross_price: 497, currency: 'BRL', order_id: 'X'}, {email: 'a@b.com'});</script>
```

Snippets prontos pra VSL milestones / quiz / scroll: ver `../_tracking/README.md` (mesmas APIs).

## Endpoints

| Endpoint | Body | Resposta |
|---|---|---|
| `POST /api/capi/event`   | `{tenant, event_name, event_id, user_data, custom_data, ...}` | `{ok, meta, tiktok}` |
| `POST /api/capi/meta`    | mesmo formato | `{ok, meta}` |
| `POST /api/capi/tiktok`  | mesmo formato | `{ok, tiktok}` |
| `POST /api/webhook/perfectpay?tenant=X` | payload PerfectPay nativo | `{ok, event, meta, tiktok}` |

## Testar localmente

**Bridge estático (1 comando):**
```bash
cd ~/Desktop/funils/funils-tracker
python3 -m http.server 8001
# abre http://localhost:8001/bridge/core.js — deve servir o JS
```

**Endpoints API (precisa `vercel dev`):**
```bash
npm i -g vercel
cd ~/Desktop/funils/funils-tracker
vercel dev
# expõe http://localhost:3000/api/capi/event etc
```

Envs locais via `.env.local` (NÃO commitar):
```
TENANT_CLIENTE4_CAPI_TOKEN=xxx
TENANT_CLIENTE4_TIKTOK_ACCESS_TOKEN=xxx
TENANT_CLIENTE4_PERFECTPAY_TOKEN=xxx
```

## Deploy

Primeiro deploy (cria projeto):
```bash
cd ~/Desktop/funils/funils-tracker
vercel deploy --prod --yes --name funils-tracker
```
Depois é só `git push` no monorepo `funils/` — o workflow GitHub Actions detecta a pasta com `.vercel/project.json` e redeploya.

## Roadmap

- [x] Bootstrap multi-tenant
- [x] Webhook PerfectPay
- [ ] Webhook Hotmart
- [ ] Webhook Kiwify
- [ ] Webhook Shopify (Order Creation)
- [ ] Dashboard simples (Next.js separado) com leads/vendas por tenant
- [ ] Vercel KV pra rastreio de funil completo (eventos persistidos por session)
