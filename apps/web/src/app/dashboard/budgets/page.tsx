'use client';

import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatBRL } from '@finance/shared';
import { useBudgets, useDeleteBudget } from '@/lib/queries/budgets';
import type { Budget } from '@/lib/types';
import { BudgetDialog } from '@/components/budgets/budget-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export default function BudgetsPage() {
  const now = new Date();
  const [monthYear, setMonthYear] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const [year, month] = monthYear.split('-').map(Number);

  const { data: budgets, isLoading, isError } = useBudgets(year, month);
  const deleteBudget = useDeleteBudget();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (budget: Budget) => {
    setEditing(budget);
    setDialogOpen(true);
  };

  const handleDelete = (budget: Budget) => {
    if (window.confirm(`Remover o orçamento de "${budget.category.name}"?`)) {
      void deleteBudget.mutateAsync(budget.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Limites mensais de gastos por categoria.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={monthYear}
            onChange={(e) => e.target.value && setMonthYear(e.target.value)}
            className="w-40"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Falha ao carregar orçamentos.</p>
      ) : !budgets || budgets.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium">Nenhum orçamento para este mês</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina limites para controlar os gastos por categoria.
          </p>
          <Button className="mt-4" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget) => {
            const percent = budget.limitCents > 0 ? Math.round((budget.spentCents / budget.limitCents) * 100) : 0;
            const over = budget.spentCents > budget.limitCents;
            return (
              <Card key={budget.id}>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    {budget.category.color && (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: budget.category.color }}
                      />
                    )}
                    <CardTitle className="text-base">{budget.category.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(budget)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(budget)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <p className={cn('text-lg font-semibold tabular-nums', over && 'text-red-600')}>
                      {formatBRL(budget.spentCents)}
                    </p>
                    <p className="text-sm text-muted-foreground">de {formatBRL(budget.limitCents)}</p>
                  </div>
                  <Progress value={Math.min(percent, 100)} className={cn(over && 'bg-red-200')} />
                  <p className={cn('text-xs', over ? 'font-medium text-red-600' : 'text-muted-foreground')}>
                    {percent}% do limite{over ? ' — estourou!' : ''}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetDialog open={dialogOpen} onOpenChange={setDialogOpen} budget={editing} />
    </div>
  );
}
