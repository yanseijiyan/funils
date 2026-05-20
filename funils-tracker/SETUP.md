# SETUP — guia operacional do funils-tracker

Este documento é um **runbook** pra adicionar um novo site (tenant) ao sistema de tracking do zero, escrito pra alguém que nunca mexeu no projeto antes. Cobre coleta de credenciais, configuração, embed, postback e validação end-to-end.

Se você não conhece o projeto, leia o [`README.md`](./README.md) primeiro pra entender a arquitetura (10 min). Depois volta aqui pra executar.

---

## ÍNDICE

- [Pré-requisitos](#pré-requisitos)
- [FASE A — Coletar credenciais (TikTok + opcional Meta)](#fase-a--coletar-credenciais-tiktok--opcional-meta)
- [FASE B — Registrar tenant no funils-tracker](#fase-b--registrar-tenant-no-funils-tracker)
- [FASE C — Setar envs no Vercel + redeploy](#fase-c--setar-envs-no-vercel--redeploy)
- [FASE D — Embed do bridge no site](#fase-d--embed-do-bridge-no-site)
- [FASE E — Configurar postback na plataforma de checkout](#fase-e--configurar-postback-na-plataforma-de-checkout)
- [FASE F — Validar end-to-end](#fase-f--validar-end-to-end)
- [Troubleshooting](#troubleshooting)
- [Referência rápida](#referência-rápida)

---

## Pré-requisitos

Tem que ter já configurado no computador (uma vez só, não por tenant):

1. **Node.js 22 LTS**: `node --version` (Node 26 pode dar problema com Next 16 do dashboard)
2. **Vercel CLI logado**: `vercel whoami` deve retornar o email
   - Se não tiver: `npm i -g vercel && vercel login`
3. **Repo clonado** em `~/Desktop/funils/`
4. **Acesso ao team Vercel `yan-s-projects20`**
5. **Conta TikTok Ads Manager** com pixel configurado
6. **Conta na plataforma de checkout** (PerfectPay, Hotmart, etc) — como produtor (precisa pra configurar postback)
7. **Postgres Neon provisionado** (Vercel Marketplace → Storage → Add Neon) — gera env `DATABASE_URL`. Mesma string vai em ambos: `funils-tracker` e `funils-dashboard`

### Sobre o dashboard (funils-dashboard)

Projeto Vercel separado em `funils/funils-dashboard/`. Visualiza dados que o tracker grava no Postgres.

**Envs específicas do dashboard:**
```bash
cd ~/Desktop/funils/funils-dashboard
vercel env add DATABASE_URL production       # mesma do funils-tracker
vercel env add DASHBOARD_PASSWORD production # senha global pros sócios
vercel env add AUTH_SECRET production        # openssl rand -hex 32 — trocar revoga TODOS os logins
```

**Schema:** rodar UMA VEZ no Neon SQL Editor (painel Vercel → Storage → seu DB → Query):
```bash
# conteúdo de funils-dashboard/lib/schema.sql
```

**Login:** vai pra `funils-dashboard.vercel.app` → digite senha → cookie 60 dias. Sócios só precisam saber a senha (passar via WhatsApp).

**Páginas:**
- `/dashboard` — Overview (cards + gráfico série + top 5 campanhas)
- `/dashboard/campaigns` — Breakdown source → campanha → conjunto → ad
- `/dashboard/funnels` — VSL retention + Quiz funnel + ScrollDepth
- `/dashboard/sales` — Lista detalhada de vendas

**Pra Quiz funcionar:** disparar evento no JS do site: `window.tracker.event('QuizStep', { step: 5 })` (substitui 5 pelo número da pergunta).
**VSL e ScrollDepth:** automático — o bridge detecta `<video>` e scroll sozinho.

**Saber se o funils-tracker está deployado:**
```bash
curl -sI https://funils-tracker.vercel.app/bridge/core.js | head -1
# Deve retornar: HTTP/2 200
```
Se não retornar 200, leia [README.md](./README.md) seção "Deploy" antes de seguir.

---

## FASE A — Coletar credenciais (TikTok + opcional Meta)

> 📋 Use um bloco de notas separado pra anotar tudo. NÃO cole tokens em chat público.

### A1 — TikTok Pixel ID
1. Acessa **https://ads.tiktok.com**
2. Menu **Tools → Events Manager**
3. Seleciona o pixel (ou cria um: "Connect data source" → "Web")
4. Topo da página: copia o **Pixel ID** (20 caracteres tipo `D7F3QPBC77U751P3JKA0`)
5. Anota: `TIKTOK_PIXEL_ID = ___________`

### A2 — TikTok Events API Access Token
1. Mesmo Events Manager, pixel selecionado
2. Menu lateral: **Settings**
3. Procura seção **"Events API"** ou **"Server Events Setup"**
4. Clica em **"Generate Access Token"** (algumas contas: "Manage Access Token")
5. **APARECE UMA VEZ SÓ** — copia e anota:
   `TIKTOK_ACCESS_TOKEN = ___________`
   *(Se perdeu, é só gerar outro — pode ter vários ativos)*

### A3 (opcional) — Meta Pixel ID + CAPI Token
*Pula essa seção se você só vai rodar TikTok Ads agora. Pode adicionar Meta depois sem deploy de código.*

1. **https://business.facebook.com/events_manager2/**
2. Seleciona o pixel → **Pixel ID** aparece no topo (15-16 dígitos)
3. **Settings → Conversions API → "Generate access token"**
4. Anota:
   `META_PIXEL_ID = ___________`
   `META_CAPI_TOKEN = ___________`

### A4 — (NÃO coletar agora) Token do webhook
> O token do postback **vem da plataforma de checkout** (PerfectPay etc) e você vai pegar na **FASE E**. Não precisa gerar nada agora.

✅ Ao final desta fase você tem **2 strings** anotadas (TikTok pixel + token), ou **4** se incluiu Meta.

---

## FASE B — Registrar tenant no funils-tracker

### B1 — Decidir o nome do tenant
Convenção: nome curto, kebab-case, único.
Exemplos: `cliente-4`, `meu-funil-tarot`, `loja-acessorios`.

> ⚠️ O nome vira parte das envs Vercel (`cliente-4` → `TENANT_CLIENTE4_*`). Caracteres não-alfanuméricos são removidos no naming.

### B2 — Rodar o script `add-tenant.sh`
```bash
cd ~/Desktop/funils/funils-tracker
./add-tenant.sh <nome> <plataforma> [meta_pixel_id] [tiktok_pixel_id]
```

Exemplos:
```bash
# Tenant novo TikTok-only (recomendado pra começar)
./add-tenant.sh meu-funil-x perfectpay "" "D7F3QPBC77U751P3JKA0"

# Tenant novo com Meta + TikTok
./add-tenant.sh meu-funil-x perfectpay "1234567890" "D7F3QPBC77U751P3JKA0"
```

Plataformas disponíveis: `perfectpay` | `hotmart` | `kiwify` | `cartpanda` | `clickbank`

O script imprime os próximos passos com os nomes corretos das envs (já com prefixo derivado do nome do tenant).

### B3 — (opcional) Editar `tenants.json` pra ajustar produtos
Se você quer que `tracker.event('Purchase', { content_ids: ['produto-x'] })` se expanda automaticamente em `contents[{...}]`, preenche o catálogo:

```jsonc
{
  "meu-funil-x": {
    "meta_pixel_id": "",
    "tiktok_pixel_id": "D7F3QPBC77U751P3JKA0",
    "platform": "perfectpay",
    "commission_rate": 1.0,
    "content_category": "info-product",
    "products": {
      "tarot-celestino": {
        "id": "PPCPMTB000XXX",
        "name": "Tarot Celestino",
        "price": 197
      }
    }
  }
}
```

`commission_rate`: 1.0 = produtor (100% líquido). 0.5 = afiliado 50%. Etc.

---

## FASE C — Setar envs no Vercel + redeploy

### C1 — Setar token TikTok
```bash
cd ~/Desktop/funils/funils-tracker
vercel env add
```

Vai perguntar 4 coisas — responde nessa ordem:

| # | Prompt | Resposta |
|---|---|---|
| 1 | `What's the name of the variable?` | `TENANT_<NOME_UPPER_SEM_DASHES>_TIKTOK_ACCESS_TOKEN` (ex: `TENANT_CLIENTE4_TIKTOK_ACCESS_TOKEN`) |
| 2 | `What's the value?` | cola o **TikTok Access Token** (modo password — nada aparece) |
| 3 | `Add to which Environments?` | aperta espaço pra marcar **Production**, Enter |
| 4 | `Make it sensitive?` | `yes` |

### C2 — Setar token PerfectPay (placeholder por enquanto)
> 💡 Você ainda não tem o token real (vem na FASE E). Coloca qualquer placeholder e atualiza depois.

```bash
vercel env add
# Nome: TENANT_<NOME>_PERFECTPAY_TOKEN
# Valor: PLACEHOLDER (vamos trocar)
# Production + sensitive
```

### C3 — (opcional) Setar Meta CAPI token e test codes
```bash
vercel env add  # TENANT_<NOME>_CAPI_TOKEN          → Meta CAPI Token (Fase A3)
vercel env add  # TENANT_<NOME>_TIKTOK_TEST_CODE    → opcional, pra ver eventos ao vivo
vercel env add  # TENANT_<NOME>_CAPI_TEST_CODE      → opcional
```

### C4 — Confirmar envs
```bash
vercel env ls
```
Deve mostrar todas as envs setadas.

### C5 — Redeploy
```bash
vercel deploy --prod --yes
```
Espera retornar `"readyState": "READY"` (~30s).

> ⚠️ **Envs só viram efeito em DEPLOYS NOVOS.** Adicionou env nova = precisa redeploy.

---

## FASE D — Embed do bridge no site

### D1 — Adicionar `<script>` antes de `</body>`
Em **todos os HTMLs** do site (index.html, vsl.html, thank-you.html, etc):

```html
<script src="https://funils-tracker.vercel.app/bridge/core.js"
        data-tenant="<NOME-DO-TENANT>"
        data-tiktok-pixel="<TIKTOK_PIXEL_ID>"
        data-platform="<perfectpay|hotmart|kiwify|cartpanda|clickbank>"
        defer></script>
```

Exemplo real:
```html
<script src="https://funils-tracker.vercel.app/bridge/core.js"
        data-tenant="cliente-4"
        data-tiktok-pixel="D7F3QPBC77U751P3JKA0"
        data-platform="perfectpay"
        defer></script>
```

**Atributos opcionais** (default funciona bem):
- `data-meta-pixel="..."` — adiciona pra rodar Meta CAPI em paralelo
- `data-commission-rate="0.5"` — pra afiliado 50%
- `data-auto-view-content="false"` — desliga ViewContent auto
- `data-auto-initiate-checkout="false"` — desliga InitiateCheckout no clique

### D2 — Deploy do site

**Se for site novo no Vercel** (sem `.vercel/project.json`):
```bash
cd ~/Desktop/funils/<NOME_DO_SITE>
vercel deploy --prod --yes --name funils-<NOME_DO_SITE> --scope yan-s-projects20
```
Anota a URL `https://funils-<NOME>.vercel.app`. Commit o `.vercel/project.json` que foi criado.

**Se já tem `.vercel/project.json` commitado:**
```bash
cd ~/Desktop/funils
git add <NOME_DO_SITE>
git commit -m "feat: tracking funils-tracker em <NOME_DO_SITE>"
git push
# Workflow GitHub Actions deploya sozinho em ~50s
```

### D3 — Verificar embed no ar
```bash
curl -s https://funils-<NOME>.vercel.app/ | grep funils-tracker
# Deve retornar a linha do <script>
```

---

## FASE E — Configurar postback na plataforma de checkout

> Esta fase é específica por plataforma. Documento detalha PerfectPay (a única com webhook implementada hoje). Hotmart/Kiwify/Cartpanda/Clickbank: ver roadmap no README.

### PerfectPay

#### E1 — Acessar painel
1. **https://app.perfectpay.com.br/** → login como **produtor**
2. Menu lateral: **Configurações → Notificações** (ou "Postback")
3. Clica em **"Adicionar nova"** (ou similar)

#### E2 — Preencher
| Campo | Valor |
|---|---|
| **URL** | `https://funils-tracker.vercel.app/api/webhook/perfectpay?tenant=<NOME-DO-TENANT>` |
| **Token** | A PerfectPay já preenche com um token gerado por eles — **deixa como tá e copia esse valor** |
| **Eventos** | ☑ Venda Aprovada, ☑ Reembolso, ☑ Boleto Pago (se vende), ☑ Pix Pago (se vende) |

Salva.

#### E3 — Atualizar env Vercel com o token correto
Lembra que na FASE C2 botou `PLACEHOLDER`? Agora atualiza com o token real da PerfectPay:

```bash
cd ~/Desktop/funils/funils-tracker

# Remove o placeholder
vercel env rm TENANT_<NOME>_PERFECTPAY_TOKEN production --yes

# Adiciona com o valor correto (cola o token da PerfectPay)
vercel env add
# Nome: TENANT_<NOME>_PERFECTPAY_TOKEN
# Valor: <cola o token que PerfectPay mostrou no painel>
# Production + sensitive

# Redeploy
vercel deploy --prod --yes
```

#### E4 — Testar postback
No painel PerfectPay, procura botão **"Enviar postback de teste"** ou similar e clica.

Verifica os logs:
```bash
vercel logs https://funils-tracker.vercel.app --json | grep webhook | tail -3
```

Procura por `"responseStatusCode":200` no log mais recente. Se 200 → ✅. Se 401 ou 500 → ver [Troubleshooting](#troubleshooting).

---

## FASE F — Validar end-to-end

### F1 — PageView (no browser)
1. Abre `https://funils-<NOME>.vercel.app/?utm_source=tiktok&utm_campaign=teste&ttclid=TEST123` no browser
2. F12 → Console → cola (depois de digitar `allow pasting` se pedir):
   ```js
   window.tracker.getValues()
   ```
3. Deve retornar objeto com `utm_source`, `utm_campaign`, `ttclid`, `_ttp` etc.

### F2 — Server-side (Network)
1. Mesmo browser, **DevTools → Network**, recarrega a página
2. Filtra por `event` ou `tracker`
3. Acha requisição `POST funils-tracker.vercel.app/api/capi/event`
4. Aba **Response**: deve ter `{"ok":true,"tiktok":{"ok":true,...}}`
5. Se aparecer `{"ok":false,"tiktok":{"skipped":"no_tiktok_token"}}` → env não foi setada/redeployada

### F3 — TikTok Events Manager
1. https://ads.tiktok.com → Tools → **Events Manager**
2. Seleciona o pixel
3. Aba **"Test Event"** (se setou `TIKTOK_TEST_CODE` no env) ou **"Events Overview"**
4. Em ~30s deve aparecer `Pageview` tipo "Server" (origem da CAPI)

### F4 — Purchase real (depois de venda teste de R$1 na plataforma)
1. Faz uma compra de teste no fluxo real (use modo sandbox da PerfectPay se possível)
2. Webhook dispara → `vercel logs` mostra `"responseStatusCode":200`
3. TikTok Events Manager: `Purchase` (ou `CompletePayment`) com `value: 1.00`

### F5 — Remover test codes pra ir pra produção
```bash
vercel env rm TENANT_<NOME>_TIKTOK_TEST_CODE production --yes
vercel env rm TENANT_<NOME>_CAPI_TEST_CODE production --yes
vercel deploy --prod --yes
```

---

## Troubleshooting

### Webhook retorna 401 (Unauthorized)
- **Causa:** token enviado pela plataforma ≠ token configurado no Vercel
- **Solução:** repete FASE E3 (rm + add com token correto + redeploy)
- **Como confirmar:** `vercel env ls` mostra `TENANT_<NOME>_PERFECTPAY_TOKEN` como `Encrypted`?

### Webhook retorna 500 (Internal Server Error)
- **Causa:** env vazia ou nome errado
- **Solução:** `vercel env ls` pra ver. Se `TENANT_<NOME>_PERFECTPAY_TOKEN` não está listada, roda `vercel env add` de novo + redeploy

### Webhook retorna 200 mas TikTok não recebeu Purchase
- **Possíveis causas:**
  - Token TikTok inválido → check `vercel logs` busca por `"skipped":"no_tiktok_token"` ou `"tiktok":{"ok":false}`
  - Status do postback não bate com `approved`/`refund` → log mostra `"skipped":"status_not_mapped"`
  - PerfectPay mandou postback de TESTE com dados não-válidos → tenta com venda real

### `window.tracker is not defined` no browser
- **Causa:** bridge não carregou
- **Solução:**
  - DevTools → Network → procura `core.js` → ver status (deve ser 200)
  - Se 404 → URL errada no `<script src>`
  - Se CORS error → improvável (CDN tem `Access-Control-Allow-Origin: *`)
  - Verifica que `data-tenant` foi preenchido

### Eventos chegam duplicados no TikTok
- **Causa:** Pixel client + Events server disparando mesmo evento sem dedup
- **Verificar:** todos os eventos usam `event_id` consistente (PageView usa o mesmo da sessão)
- **Não é um bug:** TikTok deduplica automaticamente se `event_id` bate. Se você vê 2 eventos, é porque os IDs estão diferentes.

### `Sensitive values cannot be retrieved later` ao tentar listar env
- **Não é erro** — é um aviso. Você marcou a env como sensitive. Pra trocar valor, precisa rm + add. Pra ver o valor, não consegue mais (só usar no runtime).

### Erro `command not found` ao rodar comandos
- **Causa:** comando quebrado em múltiplas linhas no terminal
- **Solução:** cola o comando inteiro em UMA linha. Se for muito longo, exporta em variável primeiro.

### `vercel env rm` removeu o env que acabei de adicionar
- **Causa:** ordem errada de execução
- **Solução:** lista com `vercel env ls`, adiciona de novo com `vercel env add`. Sempre rm ANTES de add (não depois).

---

## Referência rápida

### URLs do sistema
| O quê | URL |
|---|---|
| Bridge CDN | `https://funils-tracker.vercel.app/bridge/core.js` |
| Endpoint event | `POST https://funils-tracker.vercel.app/api/capi/event` |
| Webhook PerfectPay | `POST https://funils-tracker.vercel.app/api/webhook/perfectpay?tenant=<NOME>` |
| Dashboard Vercel | `https://vercel.com/yan-s-projects20/funils-tracker` |

### Nomes de envs por tenant
Pra tenant `meu-funil-x` → prefix `TENANT_MEUFUNILX_`:
```
TENANT_MEUFUNILX_TIKTOK_ACCESS_TOKEN     (obrigatório)
TENANT_MEUFUNILX_PERFECTPAY_TOKEN        (obrigatório se usar webhook PerfectPay)
TENANT_MEUFUNILX_CAPI_TOKEN              (opcional, Meta CAPI)
TENANT_MEUFUNILX_TIKTOK_TEST_CODE        (opcional, debug)
TENANT_MEUFUNILX_CAPI_TEST_CODE          (opcional, debug)
```
Fallback: `DEFAULT_TIKTOK_ACCESS_TOKEN` etc — se tenant não tem env próprio, usa esse.

### Comandos mais usados
```bash
# Adicionar tenant novo (do zero ao tracking funcionando)
./add-tenant.sh <nome> <plataforma> [meta_pixel] [tiktok_pixel]

# Ver envs configuradas
vercel env ls

# Adicionar env (interativo)
vercel env add

# Remover env
vercel env rm <NOME> production --yes

# Redeploy produção
vercel deploy --prod --yes

# Ver logs últimos
vercel logs https://funils-tracker.vercel.app --json | tail -20

# Filtrar logs por endpoint
vercel logs https://funils-tracker.vercel.app --json | grep webhook | tail -5
```

### Embed pronto pra copiar (TikTok-only)
```html
<script src="https://funils-tracker.vercel.app/bridge/core.js"
        data-tenant="REPLACE-COM-NOME-DO-TENANT"
        data-tiktok-pixel="REPLACE-COM-TIKTOK-PIXEL-ID"
        data-platform="perfectpay"
        defer></script>
```

### Embed pronto pra copiar (Meta + TikTok)
```html
<script src="https://funils-tracker.vercel.app/bridge/core.js"
        data-tenant="REPLACE-COM-NOME"
        data-meta-pixel="REPLACE-COM-META-PIXEL-ID"
        data-tiktok-pixel="REPLACE-COM-TIKTOK-PIXEL-ID"
        data-platform="perfectpay"
        defer></script>
```

### Eventos custom no HTML
```html
<button onclick="window.tracker.event('Lead', { content_name: 'optin-vsl' })">
  Quero saber mais
</button>

<script>
  // Na thank-you page (se você tem uma própria)
  window.tracker.event('Purchase', {
    gross_price: 497, currency: 'BRL', order_id: 'X'
  }, { email: 'cliente@x.com', phone: '11999999999' });
</script>
```

---

**Quando algo der errado e você precisar de ajuda:** copia o log do erro (`vercel logs`) + o que você tentou + qual fase parou. Procura nesse documento na seção Troubleshooting antes.
