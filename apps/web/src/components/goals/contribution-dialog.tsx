'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAddContribution } from '@/lib/queries/budgets';
import { parseMoneyInput } from '@/lib/money';
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

const schema = z.object({
  amount: z.string().min(1, 'Informe o valor'),
  date: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ContributionDialog({
  open,
  onOpenChange,
  goalId,
  goalName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalName: string;
}) {
  const addContribution = useAddContribution();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({ amount: '', date: todayISO(), notes: '' });
      setError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const amountCents = parseMoneyInput(values.amount);
    if (amountCents == null || amountCents <= 0) {
      setError('Informe um valor válido');
      return;
    }
    try {
      await addContribution.mutateAsync({
        goalId,
        amountCents,
        date: values.date || undefined,
        notes: values.notes || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar contribuição');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar à meta</DialogTitle>
          <DialogDescription>{goalName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contrib-amount">Valor (R$)</Label>
              <Input id="contrib-amount" placeholder="0,00" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrib-date">Data</Label>
              <Input id="contrib-date" type="date" {...register('date')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contrib-notes">
              Observação <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="contrib-notes" placeholder="Ex.: 13º salário" {...register('notes')} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
