'use client';

import { useState } from 'react';
import { Calendar, Loader2, Pencil, Plus, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { formatBRL } from '@finance/shared';
import { useDeleteGoal, useGoals, useRemoveContribution } from '@/lib/queries/budgets';
import type { SavingsGoal } from '@/lib/types';
import { GoalDialog } from '@/components/goals/goal-dialog';
import { ContributionDialog } from '@/components/goals/contribution-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function GoalsPage() {
  const { data: goals, isLoading, isError } = useGoals();
  const deleteGoal = useDeleteGoal();
  const removeContribution = useRemoveContribution();

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);

  const openCreate = () => {
    setEditingGoal(null);
    setGoalDialogOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalDialogOpen(true);
  };

  const handleDelete = (goal: SavingsGoal) => {
    if (window.confirm(`Remover a meta "${goal.name}"?`)) {
      void deleteGoal.mutateAsync(goal.id);
    }
  };

  const handleRemoveContribution = (goal: SavingsGoal, contributionId: string) => {
    if (window.confirm('Remover esta contribuição?')) {
      void removeContribution.mutateAsync({ goalId: goal.id, contributionId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metas de economia</h1>
          <p className="text-sm text-muted-foreground">Objetivos de longo prazo do casal.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova meta
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Falha ao carregar metas.</p>
      ) : !goals || goals.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium">Nenhuma meta ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira meta de economia.</p>
          <Button className="mt-4" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova meta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const done = goal.currentCents >= goal.targetCents;
            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    {goal.color && (
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: goal.color }} />
                    )}
                    <CardTitle className="text-base">{goal.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(goal)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(goal)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <p className={cn('text-lg font-semibold tabular-nums', done && 'text-emerald-600')}>
                      {formatBRL(goal.currentCents)}
                    </p>
                    <p className="text-sm text-muted-foreground">de {formatBRL(goal.targetCents)}</p>
                  </div>
                  <Progress value={Math.min(goal.progressPercent, 100)} className={cn(done && 'bg-emerald-200')} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{goal.progressPercent}%</span>
                    {goal.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        até {dateFmt.format(new Date(goal.deadline))}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setContributionGoal(goal)}
                  >
                    <Wallet className="h-4 w-4" />
                    Registrar contribuição
                  </Button>

                  {goal.contributions.length > 0 && (
                    <div className="space-y-1 border-t pt-3">
                      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        Contribuições
                      </p>
                      {goal.contributions.slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <div className="min-w-0">
                            <span className="truncate">{c.user.name}</span>
                            {c.notes && <span className="text-xs text-muted-foreground"> · {c.notes}</span>}
                          </div>
                          <span className="flex items-center gap-2 tabular-nums">
                            +{formatBRL(c.amountCents)}
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveContribution(goal, c.id)}
                              title="Remover contribuição"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        </div>
                      ))}
                      {goal.contributions.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          +{goal.contributions.length - 5} outras
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} goal={editingGoal} />
      {contributionGoal && (
        <ContributionDialog
          open={Boolean(contributionGoal)}
          onOpenChange={(open) => !open && setContributionGoal(null)}
          goalId={contributionGoal.id}
          goalName={contributionGoal.name}
        />
      )}
    </div>
  );
}
