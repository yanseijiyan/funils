import { getQuizFunnel, getVslRetention, getScrollDistribution, getTenants, resolveFilters, type Filters } from '@/lib/queries';
import { FiltersBar } from '@/components/filters';
import { CardSection } from '@/components/card';
import { FunnelChart } from '@/components/charts';

export const dynamic = 'force-dynamic';

export default async function FunnelsPage(props: { searchParams: Promise<Filters> }) {
  const filters = resolveFilters(await props.searchParams);
  const [quiz, vsl, scroll, tenants] = await Promise.all([
    getQuizFunnel(filters),
    getVslRetention(filters),
    getScrollDistribution(filters),
    getTenants()
  ]);

  return (
    <div className="space-y-6">
      <FiltersBar tenants={tenants} current={filters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSection title="VSL — onde estão saindo">
          <FunnelChart data={vsl} color="#3b82f6" />
          <p className="text-xs text-zinc-500 mt-4">
            Quantos sessões chegaram a cada milestone do vídeo. % é em relação a quem deu Play.
          </p>
        </CardSection>

        <CardSection title="Quiz — qual pergunta perdeu mais">
          <FunnelChart data={quiz} color="#a855f7" />
          <p className="text-xs text-zinc-500 mt-4">
            Sessões únicas por passo do quiz. Cobra evento `QuizStep` no submit de cada pergunta.
          </p>
        </CardSection>
      </div>

      <CardSection title="ScrollDepth — quanto a pessoa rolou">
        <FunnelChart data={scroll} color="#f59e0b" />
        <p className="text-xs text-zinc-500 mt-4">
          Sessões únicas que chegaram a cada % de scroll. Auto-tracking habilitado por padrão pelo bridge.
        </p>
      </CardSection>
    </div>
  );
}
