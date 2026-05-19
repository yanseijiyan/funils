#!/usr/bin/env bash
# Adiciona um tenant novo ao funils-tracker e imprime os próximos passos.
#
# Uso:  ./add-tenant.sh <nome> <plataforma> [meta_pixel_id] [tiktok_pixel_id]
# Ex:   ./add-tenant.sh cliente-5 perfectpay 1234 D8234JJC
#
# Idempotente: se tenant já existe no tenants.json, pula a edição e só imprime os passos.

set -euo pipefail

NAME="${1:-}"
PLATFORM="${2:-}"
META_PIXEL="${3:-}"
TIKTOK_PIXEL="${4:-}"

ROOT="$(cd "$(dirname "$0")" && pwd)"
ADAPTERS_DIR="$ROOT/bridge/adapters"
TENANTS_FILE="$ROOT/tenants.json"

if [[ -z "$NAME" || -z "$PLATFORM" ]]; then
  echo "uso: $0 <nome> <plataforma> [meta_pixel_id] [tiktok_pixel_id]"
  echo ""
  echo "plataformas disponíveis:"
  ls "$ADAPTERS_DIR" | sed 's/\.js$//' | sed 's/^/  - /'
  exit 1
fi

[[ -f "$ADAPTERS_DIR/$PLATFORM.js" ]] || {
  echo "erro: adapter '$PLATFORM' não existe em $ADAPTERS_DIR"
  echo "disponíveis: $(ls "$ADAPTERS_DIR" | sed 's/\.js$//' | tr '\n' ' ')"
  exit 1
}

# Naming convention pras envs: cliente-4 → CLIENTE4
UPPER=$(echo "$NAME" | tr '[:lower:]' '[:upper:]' | tr -cd 'A-Z0-9')
PLATFORM_UPPER=$(echo "$PLATFORM" | tr '[:lower:]' '[:upper:]')

STATUS=$(NAME="$NAME" PLATFORM="$PLATFORM" META_PIXEL="$META_PIXEL" TIKTOK_PIXEL="$TIKTOK_PIXEL" TENANTS_FILE="$TENANTS_FILE" node -e '
  const fs = require("fs");
  const f = process.env.TENANTS_FILE;
  const t = JSON.parse(fs.readFileSync(f, "utf8"));
  const name = process.env.NAME;
  if (t[name]) {
    process.stdout.write("exists");
  } else {
    t[name] = {
      meta_pixel_id:    process.env.META_PIXEL || "",
      tiktok_pixel_id:  process.env.TIKTOK_PIXEL || "",
      platform:         process.env.PLATFORM,
      commission_rate:  1.0,
      content_category: "",
      products:         {}
    };
    fs.writeFileSync(f, JSON.stringify(t, null, 2) + "\n");
    process.stdout.write("added");
  }
')

if [[ "$STATUS" == "added" ]]; then
  echo "✅ tenant '$NAME' adicionado em $TENANTS_FILE"
else
  echo "ℹ️  tenant '$NAME' já existia em $TENANTS_FILE (preservado)"
fi

cat <<INSTR

────────────────────────────────────────────────────────
📋 PRÓXIMOS PASSOS PRO TENANT: $NAME

1️⃣  (se necessário) Edite $TENANTS_FILE pra ajustar pixel_ids ou catálogo de products

2️⃣  Setar envs no Vercel:
    cd $ROOT
    vercel env add TENANT_${UPPER}_TIKTOK_ACCESS_TOKEN production
    vercel env add TENANT_${UPPER}_PERFECTPAY_TOKEN production
    # opcional (se for usar Meta também):
    vercel env add TENANT_${UPPER}_CAPI_TOKEN production
    # opcional (debug ao vivo no Events Manager):
    vercel env add TENANT_${UPPER}_TIKTOK_TEST_CODE production

3️⃣  Commit + push do tenants.json (workflow redeploya sozinho), OU:
    vercel deploy --prod --yes

4️⃣  Cola no <head> ou antes do </body> do site:

    <script src="https://funils-tracker.vercel.app/bridge/core.js"
            data-tenant="$NAME"
            data-tiktok-pixel="${TIKTOK_PIXEL:-SEU_TIKTOK_PIXEL_ID}"
            data-platform="$PLATFORM"
            defer></script>

5️⃣  Webhook no painel da plataforma:
    URL:   https://funils-tracker.vercel.app/api/webhook/$PLATFORM?tenant=$NAME
    Token: cola o mesmo valor que você setou em TENANT_${UPPER}_${PLATFORM_UPPER}_TOKEN
           (ou cola o token que a plataforma gerou, e atualiza a env)

────────────────────────────────────────────────────────
INSTR
