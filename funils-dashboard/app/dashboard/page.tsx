import { getOverviewCards, getSeriesByDay, getTenants, getCampaignBreakdown, type Filters } from '@/lib/queries';
import { FiltersBar, fmtBRL, fmtInt, fmtPct } from '@/components/filters';
import { Card, CardSection } from '@/components/card';
import { SeriesChart, BarRevenueChart } from '@/components/charts';

export const dynamic = 'force-dynamic';

export default async function OverviewPage(props: { searchParams: Promise<Filters> }) {
  const filters = await props.searchParams;
  const [cards, series, tenants, campaigns] = await Promise.all([
    getOverviewCards(filters),
    getSeriesByDay(filters),
    getTenants(),
    getCampaignBreakdown(filters)
  ]);

  const conversionRate = cards.visitors ? cards.sales / cards.visitors : 0;
  const aov = cards.sales ? cards.revenue / cards.sales : 0;

  const topCampaigns = campaigns.slice(0, 5).map((c) => ({
    name: (c.utm_campaign || '(sem campanha)').slice(0, 24),
    value: Number(c.revenue)
  }));

  return (
    <div className="space-y-6">
      <FiltersBar tenants={tenants} current={filters} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="Visitantes únicos"  value={fmtInt(cards.visitors)} />
        <Card label="Leads"              value={fmtInt(cards.leads)}     sub={cards.visitors ? `${fmtPct(cards.leads / cards.visitors)} conv.` : undefined} />
        <Card label="Vendas aprovadas"   value={fmtInt(cards.sales)}     sub={`taxa: ${fmtPct(conversionRate)}`} />
        <Card label="Receita bruta"      value={fmtBRL(cards.revenue)}   sub={aov > 0 ? `ticket: ${fmtBRL(aov)}` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card label="Page views"       value={fmtInt(cards.pageviews)} />
        <Card label="Initiate Checkouts" value={fmtInt(cards.checkouts)} sub={cards.leads ? `${fmtPct(cards.checkouts / Math.max(cards.leads, 1))} dos leads` : undefined} />
        <Card label="Reembolsos"        value={fmtInt(cards.refunds)} sub={cards.sales ? `${fmtPct(cards.refunds / cards.sales)} das vendas` : undefined} />
      </div>

      <CardSection title="Visitantes, Leads e Vendas por dia">
        <SeriesChart data={series} />
      </CardSection>

      <CardSection title="Top 5 campanhas por receita" action={<a href="/dashboard/campaigns" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">ver todas →</a>}>
        <BarRevenueChart data={topCampaigns} />
      </CardSection>
    </div>
  );
}
