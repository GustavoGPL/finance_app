'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatBRL } from '@finance/shared';
import { useVisibility } from '@/lib/visibility';
import { useCategoryBreakdown, useNetWorth } from '@/lib/queries/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NetWorthChart } from '@/components/charts/net-worth-chart';
import { ExpenseDonut } from '@/components/charts/expense-donut';

export default function ReportsPage() {
  const { visibility } = useVisibility();
  const now = new Date();
  const [monthYear, setMonthYear] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const [year, month] = monthYear.split('-').map(Number);

  const netWorth = useNetWorth(12, visibility);
  const categories = useCategoryBreakdown(year, month, visibility);

  const loading = netWorth.isLoading || categories.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Evolução patrimonial e análise de gastos por categoria.
          </p>
        </div>
        <Input
          type="month"
          value={monthYear}
          onChange={(e) => e.target.value && setMonthYear(e.target.value)}
          className="w-40"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução patrimonial (12 meses)</CardTitle>
              <CardDescription>Patrimônio líquido mês a mês.</CardDescription>
            </CardHeader>
            <CardContent>
              <NetWorthChart data={netWorth.data ?? []} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por categoria</CardTitle>
                <CardDescription>Despesas de {String(month).padStart(2, '0')}/{year}.</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseDonut
                  items={categories.data?.items ?? []}
                  totalCents={categories.data?.totalCents ?? 0}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhamento por categoria</CardTitle>
                <CardDescription>Valores, quantidade e participação.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!categories.data || categories.data.items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma despesa neste mês.
                  </p>
                ) : (
                  categories.data.items.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color ?? '#94a3b8' }}
                          />
                          <span className="truncate">{item.name}</span>
                          <span className="text-xs text-muted-foreground">({item.count}×)</span>
                        </span>
                        <span className="tabular-nums">
                          {formatBRL(item.totalCents)}
                          <span className="ml-2 inline-block w-9 text-right text-xs text-muted-foreground">
                            {item.percent}%
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.percent}%`,
                            backgroundColor: item.color ?? '#94a3b8',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
