'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateBudget, useUpdateBudget } from '@/lib/queries/budgets';
import { useCategories } from '@/lib/queries/transactions';
import { centsToInput, parseMoneyInput } from '@/lib/money';
import type { Budget } from '@/lib/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  categoryId: z.string().min(1, 'Escolha uma categoria'),
  monthYear: z.string().min(1, 'Informe o mês'),
  limit: z.string().min(1, 'Informe o limite'),
});

type FormValues = z.infer<typeof schema>;

function currentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function BudgetDialog({
  open,
  onOpenChange,
  budget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
}) {
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const { data: categories } = useCategories('EXPENSE');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset(
        budget
          ? {
              categoryId: budget.categoryId,
              monthYear: `${budget.year}-${String(budget.month).padStart(2, '0')}`,
              limit: centsToInput(budget.limitCents),
            }
          : { categoryId: '', monthYear: currentMonthYear(), limit: '' },
      );
      setError(null);
    }
  }, [open, budget, reset]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const limitCents = parseMoneyInput(values.limit);
    if (limitCents == null || limitCents <= 0) {
      setError('Informe um limite válido');
      return;
    }
    const [year, month] = values.monthYear.split('-').map(Number);
    try {
      if (budget) {
        await updateBudget.mutateAsync({ id: budget.id, limitCents });
      } else {
        await createBudget.mutateAsync({ categoryId: values.categoryId, year, month, limitCents });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar orçamento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? 'Editar orçamento' : 'Novo orçamento'}</DialogTitle>
          <DialogDescription>Defina um limite mensal de gastos para uma categoria.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={watch('categoryId')}
              onValueChange={(v) => setValue('categoryId', v, { shouldValidate: true })}
              disabled={Boolean(budget)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha a categoria de despesa..." />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="budget-month">Mês</Label>
              <Input id="budget-month" type="month" disabled={Boolean(budget)} {...register('monthYear')} />
              {errors.monthYear && <p className="text-sm text-destructive">{errors.monthYear.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-limit">Limite (R$)</Label>
              <Input id="budget-limit" placeholder="0,00" {...register('limit')} />
              {errors.limit && <p className="text-sm text-destructive">{errors.limit.message}</p>}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : budget ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
