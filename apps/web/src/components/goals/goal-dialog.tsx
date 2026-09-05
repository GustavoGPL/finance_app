'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateGoal, useUpdateGoal } from '@/lib/queries/budgets';
import { centsToInput, parseMoneyInput } from '@/lib/money';
import type { SavingsGoal } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const GOAL_COLORS = ['#7c3aed', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#ec4899'];

const schema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  target: z.string().min(1, 'Informe a meta'),
  deadline: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function GoalDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: SavingsGoal | null;
}) {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const [color, setColor] = useState<string>(GOAL_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        name: goal?.name ?? '',
        target: goal ? centsToInput(goal.targetCents) : '',
        deadline: goal?.deadline ? goal.deadline.slice(0, 10) : '',
      });
      setColor(goal?.color ?? GOAL_COLORS[0]);
      setError(null);
    }
  }, [open, goal, reset]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const targetCents = parseMoneyInput(values.target);
    if (targetCents == null || targetCents <= 0) {
      setError('Informe uma meta válida');
      return;
    }
    const payload = {
      name: values.name,
      targetCents,
      deadline: values.deadline || undefined,
      color,
    };
    try {
      if (goal) {
        await updateGoal.mutateAsync({ id: goal.id, ...payload });
      } else {
        await createGoal.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar meta');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? 'Editar meta' : 'Nova meta de economia'}</DialogTitle>
          <DialogDescription>Defina um objetivo de economia a longo prazo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Nome</Label>
            <Input id="goal-name" placeholder="Ex.: Viagem para a Europa" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Meta (R$)</Label>
              <Input id="goal-target" placeholder="0,00" {...register('target')} />
              {errors.target && <p className="text-sm text-destructive">{errors.target.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">
                Prazo <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="goal-deadline" type="date" {...register('deadline')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform',
                    color === c && 'ring-2 ring-ring ring-offset-2',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : goal ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
