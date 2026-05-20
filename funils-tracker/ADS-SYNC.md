# Métricas de Ads — sync TikTok Marketing API

Traz **gasto / impressões / cliques** do TikTok pra dentro do dashboard, que então
calcula **CPC, CPM, CTR, CPA, ROAS** por campanha / conjunto / anúncio.

## Como funciona

```
cron-job.org  ──GET──▶  /api/sync/tiktok-ads  ──▶  TikTok Marketing API
                                │
                                ▼
                          tabela ad_stats (Neon)
                                │
                                ▼
                     dashboard /dashboard/campaigns
                  (junta com o funil pelo ID da campanha)
```

## Setup (uma vez por operação)

### 1. Criar a tabela `ad_stats` no Neon

No SQL Editor do Neon de cada operação, rode:

```sql
CREATE TABLE IF NOT EXISTS ad_stats (
  id           BIGSERIAL PRIMARY KEY,
  tenant       TEXT NOT NULL,
  stat_date    DATE NOT NULL,
  level        TEXT NOT NULL,
  ref_id       TEXT NOT NULL,
  name         TEXT,
  campaign_id  TEXT,
  adset_id     TEXT,
  spend        NUMERIC(14,2) DEFAULT 0,
  impressions  BIGINT DEFAULT 0,
  clicks       BIGINT DEFAULT 0,
  currency     TEXT,
  source       TEXT DEFAULT 'tiktok',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant, stat_date, level, ref_id)
);
CREATE INDEX IF NOT EXISTS idx_ad_stats_tenant_date ON ad_stats (tenant, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_stats_level_ref   ON ad_stats (tenant, level, ref_id);
```

### 2. Envs no Vercel (no projeto do tracker)

```bash
vercel env add   # SYNC_SECRET  → uma senha que você inventa (a mesma vai na URL do cron)
vercel env add   # TENANT_<NOME>_TIKTOK_MARKETING_TOKEN → token da TikTok Marketing API
```
- tarot:  `TENANT_CLIENTE4_TIKTOK_MARKETING_TOKEN`  (tracker `funils-tracker`)
- japão:  `TENANT_LOJAJP_TIKTOK_MARKETING_TOKEN`    (tracker `funils-tracker-jp`)

### 3. Advertiser ID no `tenants.json`

Troque `"tiktok_advertiser_id": "PREENCHER"` pelo Advertiser ID do TikTok Ads.
Depois `vercel deploy --prod`.

### 4. Cron externo (cron-job.org)

Crie um cron a cada **15–30 min** apontando pra:

- tarot: `https://funils-tracker.vercel.app/api/sync/tiktok-ads?tenant=cliente-4&key=<SYNC_SECRET>`
- japão: `https://funils-tracker-jp.vercel.app/api/sync/tiktok-ads?tenant=loja-jp&key=<SYNC_SECRET>`

## URL de tracking dos anúncios (importante!)

Pra o gasto casar com o funil, o **destino do anúncio** no TikTok precisa carregar
os IDs do TikTok nos UTMs (via macros dinâmicos):

```
https://SEU-FUNIL.com/?utm_source=tiktok&utm_campaign=__CAMPAIGN_ID__&utm_content=__AID__&utm_term=__CID__
```

| UTM | Macro TikTok | Vira no dashboard |
|-----|--------------|-------------------|
| `utm_campaign` | `__CAMPAIGN_ID__` | Campanha |
| `utm_content`  | `__AID__`         | Conjunto |
| `utm_term`     | `__CID__`         | Anúncio |

O dashboard junta por ID e mostra os **nomes** (que vêm da Marketing API).

## Testar

```bash
curl "https://funils-tracker-jp.vercel.app/api/sync/tiktok-ads?tenant=loja-jp&key=<SYNC_SECRET>&days=7"
# espera {"ok":true,...,"db":{"ok":true,"upserted":N}}
```
Depois abra `/dashboard/campaigns` — as colunas Gasto/CPC/CPM/CTR/CPA/ROAS preenchem.
