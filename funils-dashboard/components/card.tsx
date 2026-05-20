export function Card({
  label,
  value,
  sub,
  trend
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: number; positive?: boolean };
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-3xl font-semibold mt-1 tabular-nums">{value}</p>
      <div className="flex items-baseline justify-between mt-1">
        {sub && <p className="text-xs text-zinc-400">{sub}</p>}
        {trend && (
          <span
            className={
              'text-xs font-medium ' +
              (trend.positive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400')
            }
          >
            {trend.positive ? '↑' : '↓'} {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

export function CardSection({
  title,
  children,
  action
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
