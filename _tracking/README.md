# _tracking — base de tracking dos funils

Sistema próprio que substitui o Utmify. Cobre **afiliado** (info-produto, checkout externo) e **seller** (e-commerce próprio).

Stack: **Meta Pixel + Meta CAPI + TikTok Pixel + TikTok Events API**. Dedup client↔server via `event_id` único por evento.

## Arquitetura

```
_tracking/
├── client/
│   ├── core.js                    ← núcleo: harvest, persist, fire, hooks, identify
│   └── adapters/
│       ├── hotmart.js
│       ├── kiwify.js
│       ├── cartpanda.js
│       ├── clickbank.js
│       └── perfectpay.js
├── api/
│   ├── track.js                   ← Meta CAPI bridge (Serverless Function)
│   └── track-tiktok.js            ← TikTok Events API bridge
├── install.sh                     ← instalador por site
└── README.md
```

## Instalação

```bash
./_tracking/install.sh <site> <plataforma> [pixel_id]
# exemplo
./_tracking/install.sh cliente-4 hotmart 1234567890
```

Depois edita `<site>/.tracking.json` (Meta + TikTok pixel, taxa de comissão, catálogo de produtos), **re-roda o install** pra regenerar o `tracking.js`, e seta os tokens:

```bash
vercel env add CAPI_TOKEN production --cwd <site>           # Meta CAPI (obrigatório pra CAPI)
vercel env add TIKTOK_ACCESS_TOKEN production --cwd <site>  # TikTok server-side (opcional)
vercel env add CAPI_TEST_CODE production --cwd <site>       # opcional, pra Test Events
```

## `.tracking.json` (config por site)

```jsonc
{
  "pixel_id": "1234567890",          // Meta Pixel ID
  "tiktok_pixel_id": "ABCDEFGH...",  // opcional. Se preenchido, carrega TikTok Pixel automático
  "platform": "hotmart",             // plataforma de checkout
  "enabled": true,
  "commission_rate": 0.5,            // 50% — usado pra calcular value do Purchase
  "content_category": "low-ticket",  // appended a todo evento como custom_data
  "auto_events": {
    "ViewContent": true,
    "InitiateCheckout": true
  },
  "products": {                      // catálogo pra expandir content_ids → contents[]
    "tarot-celestino": { "id": "HM12345", "name": "Tarot Celestino", "price": 97 }
  }
}
```

## Eventos suportados

### Auto-disparados (zero código)

| Evento | Quando | Override |
|---|---|---|
| **PageView** | Toda carga de página | sempre on |
| **ViewContent** | Após PageView | `auto_events.ViewContent: false` desliga |
| **InitiateCheckout** | Clique em `<a>` que aponta pra `checkoutDomains` do adapter | `auto_events.InitiateCheckout: false` desliga |

### Manuais (1 linha no HTML)

```html
<script>
  // Lead — submit de form / fim do quiz
  document.querySelector('#meu-form').addEventListener('submit', function (e) {
    var email = e.target.email.value;
    window.tracker.identify({ email: email });
    window.tracker.event('Lead', { content_name: 'optin-vsl' });
  });

  // CompleteRegistration — pós-quiz
  window.tracker.event('CompleteRegistration', { content_name: 'quiz-tarot' });

  // AddToCart — pra seller
  window.tracker.event('AddToCart', {
    contents: [{ content_id: 'sku-001', content_name: 'Mug', quantity: 1, price: 29.90 }],
    value: 29.90, currency: 'BRL'
  });

  // Purchase — thank-you page (se você tem uma)
  window.tracker.event('Purchase', {
    gross_price: 497,            // tracker calcula value = 497 * commission_rate automático
    currency: 'BRL',
    content_ids: ['tarot-celestino'],  // expande pra contents[] usando .tracking.json.products
    order_id: 'HM12345'
  }, {
    email: 'cliente@x.com',      // hashed no servidor (Meta CAPI + TikTok Events)
    phone: '11999999999'
  });
</script>
```

### Custom pra funil de afiliado (opt-in, copie/cole)

**VSL milestones** (HTML5 player puro):
```html
<script>
  var v = document.querySelector('video');
  var fired = {};
  v.addEventListener('play',  function () {
    if (!fired.play) { window.tracker.event('VSLPlay'); fired.play = true; }
  });
  v.addEventListener('timeupdate', function () {
    var pct = v.currentTime / v.duration;
    [25, 50, 75].forEach(function (m) {
      if (pct >= m/100 && !fired[m]) {
        window.tracker.event('VSL_' + m);
        fired[m] = true;
      }
    });
  });
</script>
```

**Quiz events** (pro cliente-3 Relatio JP, 35 perguntas):
```html
<script>
  window.tracker.event('QuizStart');                          // ao abrir pergunta 1
  window.tracker.event('QuizStep', { step: 5 });              // a cada pergunta
  window.tracker.event('QuizComplete', { steps_total: 35 }); // ao terminar
</script>
```

**CTAClick com label** (saber qual CTA converte):
```html
<button onclick="window.tracker.event('CTAClick', { content_name: 'header-cta' })">
  Comprar agora
</button>
```

**ScrollDepth**:
```html
<script>
  var hits = {};
  window.addEventListener('scroll', function () {
    var pct = (window.scrollY + innerHeight) / document.body.scrollHeight * 100;
    [50, 75, 100].forEach(function (m) {
      if (pct >= m && !hits[m]) { window.tracker.event('ScrollDepth_' + m); hits[m] = true; }
    });
  });
</script>
```

## API completa (`window.tracker`)

```js
tracker.event(name, params?, extras?)
// name: 'PageView' | 'ViewContent' | 'Lead' | 'AddToCart' | 'InitiateCheckout' |
//       'AddPaymentInfo' | 'Purchase' | 'CompleteRegistration' | qualquer custom
// params: { value, currency, contents:[], content_ids:[], content_name, content_category,
//           gross_price, order_id, ... }
// extras: { email, phone, first_name, last_name, city, state, zip, country, external_id }

tracker.identify(userData)
// Persiste PII pra TODOS os próximos eventos. Faz TikTok identify client-side também.

tracker.getValues()       // debug — mostra UTMs/click_ids/cookies capturados
tracker.getEventId()      // PageView event_id da sessão
```

## Como funciona em runtime (resumido)

1. Visitante chega em `?utm_source=fb&fbclid=ABC` → harvest → persist (session+local+cookie)
2. Dispara `PageView`: client Pixel + CAPI server-side (mesmo `event_id` → Meta deduplica)
3. Se `auto_events.ViewContent`: dispara `ViewContent` 50ms depois (pega `content_name` do `<title>`)
4. Hooka `<a>`/`<form>` apontando pro checkout: injeta UTMs+click_ids; clique dispara `InitiateCheckout`
5. Re-aplica hooks a cada 5s por 30s (VSL/quiz com late-render)

## Fase 2 — Webhook de venda (Purchase real server-side)

**Disponível para:** PerfectPay (`api/webhook/perfectpay.js`).
Hotmart / Kiwify / Cartpanda / Clickbank: TODO.

### Como funciona (atribuição perfeita sem storage)

```
[1] User clica em ?utm_source=tiktok&ttclid=ABC&fbclid=XYZ
       │
       ▼
[2] tracker.event('PageView') → /api/track + /api/track-tiktok  (server-side)
       │
       ▼
[3] User clica em <a href="https://pay.perfectpay.com.br/...">
       │  adapter injeta: ?utm_source=tiktok&ttclid=ABC&fbclid=XYZ&event_id=<uuid>
       │  adapter dispara InitiateCheckout (client + server)
       ▼
[4] PerfectPay armazena todos os params no contexto da venda
       │
       ▼
[5] User paga → PerfectPay POST → https://seusite.com/api/webhook/perfectpay
       │  payload inclui: src=<uuid> (event_id), ttclid, fbclid, customer{email, phone}, sale_amount
       ▼
[6] /api/webhook/perfectpay valida token → dispara Purchase pro Meta CAPI + TikTok Events API
       │  com mesmo event_id + ttclid → atribuição perfeita à campanha original
       ▼
[7] TikTok Events Manager mostra Purchase atribuído à campanha
```

Sem precisar de banco de dados. PerfectPay funciona como o "estado" entre clique e venda.

### Configurar no painel PerfectPay

1. Logado como produtor → **Configurações → Notificações (Postback)**
2. **URL**: `https://<seu-dominio>.vercel.app/api/webhook/perfectpay`
3. **Eventos a ativar** (mínimo): `Venda Aprovada`, `Reembolso`. Adicione `Boleto Pago` e `Pix Pago` se vender por esses meios
4. **Token**: gere um UUID aleatório (`uuidgen` no terminal), cola tanto no painel PerfectPay quanto no env `PERFECTPAY_WEBHOOK_TOKEN` no Vercel — webhook valida que o token bate antes de processar

### Envs necessárias pro webhook funcionar

```bash
# Token do postback (obrigatório)
vercel env add PERFECTPAY_WEBHOOK_TOKEN production

# Pixel IDs (o webhook envia pra estes pixels)
vercel env add PIXEL_ID production               # Meta Pixel
vercel env add TIKTOK_PIXEL_ID production        # TikTok Pixel

# Tokens dos endpoints CAPI/Events API
vercel env add CAPI_TOKEN production
vercel env add TIKTOK_ACCESS_TOKEN production

# Opcionais (test events ao vivo)
vercel env add CAPI_TEST_CODE production
vercel env add TIKTOK_TEST_CODE production
```

### Testar o webhook localmente

```bash
curl -X POST http://localhost:3000/api/webhook/perfectpay \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "<seu-PERFECTPAY_WEBHOOK_TOKEN>",
    "sale_status_enum_key": "approved",
    "sale_amount": 197.00,
    "currency_enum_key": "BRL",
    "code": "PPCPMTB000123",
    "event_id": "test-uuid-1234",
    "ttclid": "fake-ttclid",
    "fbclid": "fake-fbclid",
    "product": {"code": "PPPB001", "name": "Tarot Celestino"},
    "customer": {"email": "teste@x.com", "phone_formated": "11999999999", "full_name": "João Silva"}
  }'
```
(precisa `vercel dev` rodando, não funciona com `python3 -m http.server`)

## Roadmap futuro

- Webhooks pra **Hotmart / Kiwify / Cartpanda / Clickbank** (mesma estrutura, parsing diferente)
- **Refund/Chargeback events** com value negativo (já implementado pra PerfectPay)
- **Storage opcional** (Vercel KV) pra rastrear funil completo com mais detalhe
- **Dashboard próprio** (Next.js separado) se eventualmente quiser sair de "ver no Events Manager"

## Debug

- Browser console: `window.tracker.getValues()` mostra tudo capturado
- Meta Events Manager → Test Events: se `CAPI_TEST_CODE` setado, eventos ao vivo
- TikTok Events Manager → Test Event: se `TIKTOK_TEST_CODE` setado, idem
- Logs CAPI: `vercel logs <deployment>` mostra resposta de cada POST

## Adicionar plataforma nova

1. Criar `client/adapters/<nome>.js` (copiar de qualquer existente)
2. Ajustar `checkoutDomains` e `paramMap`
3. (opcional) `onApply(values)` pra lógica custom (ex: `clickbank.js` monta `tid`)
