import { getQuizFunnel, getVslRetention, getScrollDistribution, getTenants, getCampaigns, resolveFilters, type Filters, type FunnelStep } from '@/lib/queries';
import { FiltersBar } from '@/components/filters';
import { CardSection } from '@/components/card';
import { FunnelChart } from '@/components/charts';
import { fmtInt, fmtPct } from '@/lib/format';

export const dynamic = 'force-dynamic';

const hasData = (d: FunnelStep[]) => d.some((s) => s.count > 0);

function Summary({ data }: { data: FunnelStep[] }) {
  const entrada = data[0]?.count || 0;
  const saida = data[data.length - 1]?.count || 0;
  const taxa = entrada ? saida / entrada : 0;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
      <span>Entrada <b className="text-zinc-200 tabular-nums">{fmtInt(entrada)}</b></span>
      <span className="text-zinc-600">→</span>
      <span>Conclusão <b className="text-zinc-200 tabular-nums">{fmtInt(saida)}</b></span>
      <span className="text-zinc-600">·</span>
      <span>taxa <b className="text-zinc-200 tabular-nums">{fmtPct(taxa)}</b></span>
    </div>
  );
}

export default async function FunnelsPage(props: { searchParams: Promise<Filters> }) {
  const filters = resolveFilters(await props.searchParams);
  const [quiz, vsl, scroll, tenants, campaigns] = await Promise.all([
    getQuizFunnel(filters),
    getVslRetention(filters),
    getScrollDistribution(filters),
    getTenants(),
    getCampaigns(filters.tenant)
  ]);

  return (
    <div className="space-y-6">
      <FiltersBar tenants={tenants} campaigns={campaigns} current={filters} />

      {/* QUIZ — o mais detalhado primeiro */}
      <CardSection title="Quiz — qual pergunta perdeu mais" action={hasData(quiz) ? <Summary data={quiz} /> : undefined}>
        <FunnelChart data={quiz} color="#a855f7" dropoff gradient />
        <p className="text-xs text-zinc-500 mt-4">
          Sessões únicas por passo. <b>▼ %</b> = quanto caiu em relação ao passo anterior; o passo em
          vermelho é onde o quiz mais perde. Clique no passo pra abrir a página real. Cobra `QuizStep` no submit de cada pergunta.
        </p>
      </CardSection>

      {/* VÍDEO + SCROLL lado a lado, só os que têm dados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasData(vsl) && (
          <CardSection title="VSL — onde estão saindo" action={<Summary data={vsl} />}>
            <FunnelChart data={vsl} color="#3b82f6" gradient />
            <p className="text-xs text-zinc-500 mt-4">
              Sessões que chegaram a cada milestone do vídeo. % é em relação a quem deu Play.
            </p>
          </CardSection>
        )}

        {hasData(scroll) && (
          <CardSection title="ScrollDepth — quanto a pessoa rolou" action={<Summary data={scroll} />}>
            <FunnelChart data={scroll} color="#f59e0b" gradient />
            <p className="text-xs text-zinc-500 mt-4">
              Sessões únicas que chegaram a cada % de scroll. Auto-tracking habilitado por padrão pelo bridge.
            </p>
          </CardSection>
        )}
      </div>

      {!hasData(vsl) && !hasData(scroll) && (
        <p className="text-xs text-zinc-600">
          Sem dados de VSL ou ScrollDepth no período — esses blocos aparecem quando houver eventos.
        </p>
      )}
    </div>
  );
}
