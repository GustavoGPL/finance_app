'use client';

import { useState } from 'react';
import { CalendarClock, Loader2, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { formatBRL } from '@finance/shared';
import { useVisibility } from '@/lib/visibility';
import { useCategoryBreakdown, useCoupleSplit, useNetWorth, useOverview } from '@/lib/queries/dashboard';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ExpenseDonut } from '@/components/charts/expense-donut';
import { NetWorthChart } from '@/components/charts/net-worth-chart';
import { cn } from '@/lib/utils';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

export default function DashboardPage() {
  const { visibility } = useVisibility();
  const { user } = useAuth();

  const now = new Date();
  const [monthYear, setMonthYear] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [year, month] = monthYear.split('-').map(Number);

  const overview = useOverview(year, month, visibility);
  const categories = useCategoryBreakdown(year, month, visibility);
  const netWorth = useNetWorth(6, visibility);
  const coupleSplit = useCoupleSplit(year, month);

  const loading = overview.isLoading || categories.isLoading || netWorth.isLoading || coupleSplit.isLoading;
  const data = overview.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
          <p className="text-sm text-muted-foreground">
            Olá, {user?.name.split(' ')[0]} — acompanhe as finanças do casal.
          </p>
        </div>
        <Input type="month" value={monthYear} onChange={(e) => e.target.value && setMonthYear(e.target.value)} className="w-40" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Receitas do mês"
              value={formatBRL(data?.incomeCents ?? 0)}
              tone="up"
            />
            <KpiCard
              icon={<TrendingDown className="h-4 w-4" />}
              label="Despesas do mês"
              value={formatBRL(data?.expenseCents ?? 0)}
              tone="down"
            />
            <KpiCard
              icon={<Wallet className="h-4 w-4" />}
              label="Resultado do mês"
              value={formatBRL(data?.netCents ?? 0)}
              tone={(data?.netCents ?? 0) >= 0 ? 'up' : 'down'}
            />
            <KpiCard
              icon={<PiggyBank className="h-4 w-4" />}
              label="Patrimônio atual"
              value={formatBRL((data?.cashTotalCents ?? 0) - (data?.debtTotalCents ?? 0))}
              tone={(data?.cashTotalCents ?? 0) - (data?.debtTotalCents ?? 0) >= 0 ? 'neutral' : 'down'}
              caption={`Contas ${formatBRL(data?.cashTotalCents ?? 0)} · dívidas ${formatBRL(data?.debtTotalCents ?? 0)}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Evolução patrimonial</CardTitle>
                <CardDescription>Patrimônio líquido nos últimos 6 meses.</CardDescription>
              </CardHeader>
              <CardContent>
                <NetWorthChart data={netWorth.data ?? []} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Gastos por categoria</CardTitle>
                <CardDescription>Distribuição das despesas do mês.</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseDonut items={categories.data?.items ?? []} totalCents={categories.data?.totalCents ?? 0} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4" />
                  Próximos vencimentos (7 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data || data.upcoming.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nada vencendo nos próximos 7 dias.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {data.upcoming.map((item) => (
                      <li key={`${item.kind}-${item.id}-${item.dueDate}`} className="flex items-center justify-between py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">Vence em {dateFmt.format(new Date(item.dueDate))}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.kind === 'invoice' ? 'secondary' : 'outline'}>
                            {item.kind === 'invoice' ? 'Fatura' : 'Conta'}
                          </Badge>
                          <span className="font-medium tabular-nums">{formatBRL(item.amountCents)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Divisão de custos do casal</CardTitle>
                <CardDescription>Quanto cada um pagou das despesas compartilhadas no mês.</CardDescription>
              </CardHeader>
              <CardContent>
                <CoupleSplitView split={coupleSplit.data} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function CoupleSplitView({
  split,
}: {
  split: { totalSharedCents: number; equalShareCents: number; members: { name: string; paidCents: number; balanceCents: number }[] } | undefined;
}) {
  if (!split || split.totalSharedCents === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem despesas compartilhadas neste mês.</p>;
  }

  const owesIndex = split.members.findIndex((m) => m.balanceCents > 0);
  const receivesIndex = split.members.findIndex((m) => m.balanceCents < 0);
  const owes = owesIndex >= 0 ? split.members[owesIndex] : null;
  const receives = receivesIndex >= 0 ? split.members[receivesIndex] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Total compartilhado</span>
        <span className="text-lg font-semibold">{formatBRL(split.totalSharedCents)}</span>
      </div>
      <div className="space-y-2">
        {split.members.map((m) => (
          <div key={m.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="font-medium">{m.name}</span>
            <span className="tabular-nums">{formatBRL(m.paidCents)}</span>
          </div>
        ))}
      </div>
      {owes && receives && (
        <div className="rounded-md bg-muted px-3 py-2.5 text-sm">
          <span className="font-medium">{owes.name}</span> deve{' '}
          <span className="font-medium">{formatBRL(Math.abs(owes.balanceCents))}</span> a{' '}
          <span className="font-medium">{receives.name}</span> para acertar a divisão.
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'up' | 'down' | 'neutral';
  caption?: string;
}) {
  const IconWrap = ({ children }: { children: React.ReactNode }) => (
    <span
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg',
        tone === 'up' && 'bg-emerald-100 text-emerald-700',
        tone === 'down' && 'bg-red-100 text-red-700',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <IconWrap>{icon}</IconWrap>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
        {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}
