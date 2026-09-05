'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatShortBRL } from '@/lib/money';
import type { NetWorthPoint } from '@/lib/queries/dashboard';

export function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    cash: d.cashCents / 100,
    debt: d.debtCents / 100,
    net: d.netCents / 100,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickFormatter={(v: number) => formatShortBRL(v * 100)}
            width={70}
          />
          <Tooltip
            formatter={(value) => formatShortBRL(Number(value) * 100)}
            labelFormatter={(label) => `Mês ${label}`}
            contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
          />
          <Area
            type="monotone"
            dataKey="net"
            name="Patrimônio"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#netFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
