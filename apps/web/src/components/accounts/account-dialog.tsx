'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ACCOUNT_TYPES, OWNER_TYPES, type AccountType, type OwnerType } from '@finance/shared';
import { useCreateAccount, useUpdateAccount } from '@/lib/queries/accounts';
import { centsToInput, parseMoneyInput } from '@/lib/money';
import { ACCOUNT_TYPE_LABEL, OWNER_TYPE_LABEL, type Account } from '@/lib/types';
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
  name: z.string().min(2, 'Informe um nome'),
  type: z.enum(ACCOUNT_TYPES),
  ownerType: z.enum(OWNER_TYPES),
  initialBalance: z.string().optional(),
  creditLimit: z.string().optional(),
  closingDay: z.string().optional(),
  dueDay: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AccountDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}) {
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: 'CHECKING', ownerType: 'SHARED' } });

  const type = watch('type');
  const isCard = type === 'CREDIT_CARD';

  useEffect(() => {
    if (open) {
      reset(
        account
          ? {
              name: account.name,
              type: account.type,
              ownerType: account.ownerType,
              initialBalance: centsToInput(account.initialBalanceCents),
              creditLimit: account.creditLimitCents != null ? centsToInput(account.creditLimitCents) : '',
              closingDay: account.closingDay != null ? String(account.closingDay) : '',
              dueDay: account.dueDay != null ? String(account.dueDay) : '',
            }
          : { name: '', type: 'CHECKING', ownerType: 'SHARED', initialBalance: '', creditLimit: '', closingDay: '', dueDay: '' },
      );
      setError(null);
    }
  }, [open, account, reset]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const initialBalanceCents = values.initialBalance ? parseMoneyInput(values.initialBalance) : 0;
    if (initialBalanceCents == null) {
      setError('Saldo inicial inválido');
      return;
    }

    const payload: {
      name: string;
      type: AccountType;
      ownerType: OwnerType;
      initialBalanceCents: number;
      creditLimitCents?: number;
      closingDay?: number;
      dueDay?: number;
    } = {
      name: values.name,
      type: values.type,
      ownerType: values.ownerType,
      initialBalanceCents,
    };

    if (isCard) {
      const creditLimitCents = values.creditLimit ? parseMoneyInput(values.creditLimit) : null;
      const closingDay = values.closingDay ? Number(values.closingDay) : null;
      const dueDay = values.dueDay ? Number(values.dueDay) : null;
      if (creditLimitCents == null || closingDay == null || dueDay == null) {
        setError('Cartão exige limite, dia de fechamento e dia de vencimento');
        return;
      }
      payload.creditLimitCents = creditLimitCents;
      payload.closingDay = closingDay;
      payload.dueDay = dueDay;
    }

    try {
      if (account) {
        await updateAccount.mutateAsync({ id: account.id, ...payload });
      } else {
        await createAccount.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar conta');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          <DialogDescription>Configure sua conta bancária ou cartão de crédito.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Ex.: Nubank, Conta Corrente..." {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setValue('type', v as AccountType, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pertence a</Label>
              <Select
                value={watch('ownerType')}
                onValueChange={(v) => setValue('ownerType', v as OwnerType, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OWNER_TYPES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {OWNER_TYPE_LABEL[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCard ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Limite (R$)</Label>
                <Input id="creditLimit" placeholder="0,00" {...register('creditLimit')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingDay">Fecha dia</Label>
                <Input id="closingDay" type="number" min={1} max={31} placeholder="27" {...register('closingDay')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDay">Vence dia</Label>
                <Input id="dueDay" type="number" min={1} max={31} placeholder="5" {...register('dueDay')} />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="initialBalance">Saldo inicial (R$)</Label>
              <Input id="initialBalance" placeholder="0,00" {...register('initialBalance')} />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : account ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
