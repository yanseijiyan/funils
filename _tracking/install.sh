#!/usr/bin/env bash
# Instala o tracking num site do monorepo funils.
#
# Uso:  ./_tracking/install.sh <site> <plataforma> [pixel_id]
# Ex:   ./_tracking/install.sh cliente-4 hotmart 1234567890
#
# Plataformas: hotmart | kiwify | cartpanda | clickbank | perfectpay
#
# Idempotente: pode rodar várias vezes (atualiza arquivos, não duplica <script>).

set -euo pipefail

SITE="${1:-}"
PLATFORM="${2:-}"
PIXEL_ID="${3:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRACKING="$ROOT/_tracking"
SITE_DIR="$ROOT/$SITE"
ADAPTER_FILE="$TRACKING/client/adapters/$PLATFORM.js"

if [[ -z "$SITE" || -z "$PLATFORM" ]]; then
  echo "uso: $0 <site> <plataforma> [pixel_id]"
  echo "plataformas:"; ls "$TRACKING/client/adapters/" | sed 's/\.js$//' | sed 's/^/  - /'
  exit 1
fi
[[ -d "$SITE_DIR" ]]      || { echo "erro: pasta '$SITE_DIR' não existe"; exit 1; }
[[ -f "$ADAPTER_FILE" ]]  || { echo "erro: adapter '$PLATFORM' não existe em $TRACKING/client/adapters/"; exit 1; }

# 1) .tracking.json (cria se não existir; preserva config se já tiver)
CFG="$SITE_DIR/.tracking.json"
if [[ ! -f "$CFG" ]]; then
  cat > "$CFG" <<JSON
{
  "pixel_id": "${PIXEL_ID:-REPLACE_ME}",
  "tiktok_pixel_id": "",
  "platform": "$PLATFORM",
  "enabled": true,
  "commission_rate": 1.0,
  "content_category": "",
  "auto_events": {
    "ViewContent": true,
    "InitiateCheckout": true
  },
  "products": {}
}
JSON
  echo "criado: $CFG"
else
  echo "ok:      $CFG (preservado — edite manualmente pra atualizar)"
fi

# 2) Gera tracking.js (config + adapter + core, nessa ordem)
PIXEL_FROM_CFG=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CFG','utf8')).pixel_id||'')")
TT_FROM_CFG=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CFG','utf8')).tiktok_pixel_id||'')")
TRACK_OUT="$SITE_DIR/tracking.js"
{
  echo "/* AUTO-GERADO por _tracking/install.sh — não edite à mão.";
  echo " * Plataforma: $PLATFORM | Pixel: $PIXEL_FROM_CFG | TikTok: ${TT_FROM_CFG:-(off)} */";
  # Injeta config inline a partir do .tracking.json
  echo "window._tracking = $(node -e "
    var c = JSON.parse(require('fs').readFileSync('$CFG','utf8'));
    delete c.platform;
    process.stdout.write(JSON.stringify(c));
  ");";
  cat "$ADAPTER_FILE";
  cat "$TRACKING/client/core.js";
} > "$TRACK_OUT"
echo "gerado:  $TRACK_OUT"

# 3) /api/track.js + /api/track-tiktok.js
mkdir -p "$SITE_DIR/api"
cp "$TRACKING/api/track.js"         "$SITE_DIR/api/track.js"
cp "$TRACKING/api/track-tiktok.js"  "$SITE_DIR/api/track-tiktok.js"
echo "copiado: $SITE_DIR/api/track.js"
echo "copiado: $SITE_DIR/api/track-tiktok.js"

# 3.1) Webhook da plataforma (Fase 2) — se existir um handler pra ela
WEBHOOK_SRC="$TRACKING/api/webhook/$PLATFORM.js"
if [[ -f "$WEBHOOK_SRC" ]]; then
  mkdir -p "$SITE_DIR/api/webhook"
  cp "$WEBHOOK_SRC" "$SITE_DIR/api/webhook/$PLATFORM.js"
  echo "copiado: $SITE_DIR/api/webhook/$PLATFORM.js"
  HAS_WEBHOOK=1
else
  HAS_WEBHOOK=0
fi

# 4) Injeta <script src="/tracking.js" defer></script> antes de </body>
SCRIPT_TAG='<script src="/tracking.js" defer></script>'
INJECTED=0
SKIPPED=0
while IFS= read -r -d '' f; do
  if grep -q '/tracking.js' "$f"; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi
  if grep -qi '</body>' "$f"; then
    sed -i '' "s|</body>|    ${SCRIPT_TAG}\\
  </body>|I" "$f"
    INJECTED=$((INJECTED+1))
    echo "injetado: $f"
  else
    printf '\n%s\n' "$SCRIPT_TAG" >> "$f"
    INJECTED=$((INJECTED+1))
    echo "appended: $f (sem </body>)"
  fi
done < <(find "$SITE_DIR" -maxdepth 3 -name '*.html' -type f -print0)

echo ""
echo "─── feito ──────────────────────────────────────────"
echo "site:        $SITE"
echo "plataforma:  $PLATFORM"
echo "pixel meta:  ${PIXEL_FROM_CFG:-(vazio — edite $CFG)}"
echo "pixel tt:    ${TT_FROM_CFG:-(off — preencha tiktok_pixel_id no .tracking.json se quiser)}"
echo "html:        $INJECTED injetados / $SKIPPED já tinham"
echo ""
echo "próximos passos:"
echo "  1. edite $CFG (pixel_id, tiktok_pixel_id, commission_rate, products{})"
echo "  2. re-rode esse script pra regenerar tracking.js com a config atualizada"
echo "  3. setar envs no Vercel (cd \"$SITE_DIR\" e rode):"
echo "       vercel env add CAPI_TOKEN production           # Meta CAPI"
echo "       vercel env add TIKTOK_ACCESS_TOKEN production  # TikTok Events API"
if [[ "$HAS_WEBHOOK" == "1" ]]; then
  echo "       # webhook (Fase 2) precisa também:"
  echo "       vercel env add PIXEL_ID production               # mesmo valor do .tracking.json"
  echo "       vercel env add TIKTOK_PIXEL_ID production        # idem"
  echo "       vercel env add PERFECTPAY_WEBHOOK_TOKEN production  # token compartilhado com painel PP"
fi
echo "  4. git add $SITE && git commit -m 'add: tracking ($PLATFORM) em $SITE' && git push"
if [[ "$HAS_WEBHOOK" == "1" ]]; then
  echo ""
  echo "  ⚡ Webhook URL pra configurar no painel PerfectPay (Configurações → Notificações):"
  echo "       https://<seu-dominio>/api/webhook/$PLATFORM"
fi
