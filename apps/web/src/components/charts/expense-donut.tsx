'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatBRL } from '@finance/shared';
import type { CategoryBreakdownItem } from '@/lib/queries/dashboard';

export function ExpenseDonut({
  items,
  totalCents,
}: {
  items: CategoryBreakdownItem[];
  totalCents: number;
}) {
  const data = items.slice(0, 6).map((it) => ({
    name: it.name,
    value: it.totalCents,
    color: it.color ?? '#94a3b8',
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Sem despesas neste mês.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatBRL(Number(value))}
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-semibold">{formatBRL(totalCents)}</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5">
        {items.slice(0, 6).map((it) => (
          <li key={it.id} className="flex items-center justify-between text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: it.color ?? '#94a3b8' }}
              />
              <span className="truncate">{it.name}</span>
            </span>
            <span className="tabular-nums">
              {formatBRL(it.totalCents)}
              <span className="ml-2 w-9 text-right text-xs text-muted-foreground">{it.percent}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
