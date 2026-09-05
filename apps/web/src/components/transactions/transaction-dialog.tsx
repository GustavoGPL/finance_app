'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  OWNER_TYPES,
  RECURRENCE_TYPES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type OwnerType,
  type Recurrence,
  type TransactionStatus,
  type TransactionType,
} from '@finance/shared';
import { useAccounts } from '@/lib/queries/accounts';
import { useCategories, useCreateTransaction, useTags, useUpdateTransaction } from '@/lib/queries/transactions';
import { useAuth } from '@/lib/auth';
import { centsToInput, parseMoneyInput } from '@/lib/money';
import {
  RECURRENCE_LABEL,
  TRANSACTION_STATUS_LABEL,
  TRANSACTION_TYPE_LABEL,
  type Transaction,
} from '@/lib/types';
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

const INSTALLMENT_OPTIONS = ['1', '2', '3', '4', '6', '10', '12'];

const schema = z.object({
  description: z.string().min(2, 'Informe a descrição'),
  amount: z.string().min(1, 'Informe o valor'),
  date: z.string().min(1, 'Informe a data'),
  type: z.enum(TRANSACTION_TYPES),
  accountId: z.string().optional(),
  transferToAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  installments: z.string().optional(),
  ownerType: z.enum(OWNER_TYPES),
  status: z.enum(TRANSACTION_STATUSES),
  recurrence: z.enum(RECURRENCE_TYPES),
  paidById: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}) {
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const { user: currentUser, household } = useAuth();
  const { data: accounts } = useAccounts('ALL');
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const type = watch('type') ?? 'EXPENSE';
  const accountId = watch('accountId');
  const selectedAccount = accounts?.find((a) => a.id === accountId);
  const isCard = selectedAccount?.type === 'CREDIT_CARD';

  useEffect(() => {
    if (open) {
      const d = transaction?.date ? transaction.date.slice(0, 10) : todayISO();
      reset({
        description: transaction?.description ?? '',
        amount: transaction ? centsToInput(transaction.amountCents) : '',
        date: d,
        type: transaction?.type ?? 'EXPENSE',
        accountId: transaction?.accountId ?? transaction?.creditCardId ?? '',
        transferToAccountId: transaction?.transferToAccountId ?? '',
        categoryId: transaction?.categoryId ?? '',
        installments: transaction?.installmentTotal ? String(transaction.installmentTotal) : '1',
        ownerType: transaction?.ownerType ?? 'SHARED',
        status: transaction?.status ?? 'PAID',
        recurrence: transaction?.recurrence ?? 'ONCE',
        paidById: transaction?.paidBy?.id ?? '',
        tags: transaction?.tags.join(', ') ?? '',
      });
      setError(null);
    }
  }, [open, transaction, reset]);

  const categoryOptions = useMemo(() => {
    if (!categories) return [];
    const byId = new Map(categories.map((c) => [c.id, c]));
    const filtered = categories.filter((c) => c.type === type);
    return filtered.map((c) => {
      const parent = c.parentId ? byId.get(c.parentId) : null;
      return {
        id: c.id,
        label: parent ? `${parent.name} · ${c.name}` : c.name,
      };
    });
  }, [categories, type]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const amountCents = parseMoneyInput(values.amount);
    if (amountCents == null || amountCents <= 0) {
      setError('Informe um valor válido');
      return;
    }

    const payload: {
      description: string;
      amountCents: number;
      type: TransactionType;
      date: string;
      ownerType: OwnerType;
      status: TransactionStatus;
      recurrence: Recurrence;
      tags?: string[];
      categoryId?: string;
      accountId?: string;
      creditCardId?: string;
      transferToAccountId?: string;
      paidById?: string;
      installments?: number;
    } = {
      description: values.description,
      amountCents,
      type: values.type,
      date: values.date,
      ownerType: values.ownerType,
      status: values.status,
      recurrence: values.recurrence,
      categoryId: values.categoryId || undefined,
      tags: values.tags
        ? values.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };

    if (values.type === 'TRANSFER') {
      if (!values.accountId || !values.transferToAccountId || values.accountId === values.transferToAccountId) {
        setError('Escolha duas contas diferentes para a transferência');
        return;
      }
      payload.accountId = values.accountId;
      payload.transferToAccountId = values.transferToAccountId;
    } else {
      if (!selectedAccount) {
        setError('Escolha uma conta ou cartão');
        return;
      }
      if (isCard) {
        payload.creditCardId = values.accountId;
        if (values.type === 'EXPENSE') {
          payload.installments = values.installments ? Number(values.installments) : 1;
        }
      } else {
        payload.accountId = values.accountId;
      }
    }

    if (values.type === 'EXPENSE') {
      payload.paidById = values.paidById || currentUser?.id;
    }

    try {
      if (transaction) {
        await updateTx.mutateAsync({ id: transaction.id, ...payload });
      } else {
        await createTx.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar transação');
    }
  };

  const bankAccounts = accounts?.filter((a) => a.type !== 'CREDIT_CARD') ?? [];
  const cardAccounts = accounts?.filter((a) => a.type === 'CREDIT_CARD') ?? [];
  const allPaymentOptions = [...bankAccounts, ...cardAccounts];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar transação' : 'Nova transação'}</DialogTitle>
          <DialogDescription>Registre receitas, despesas ou transferências.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {TRANSACTION_TYPES.map((t) => (
              <Button
                key={t}
                type="button"
                variant={type === t ? 'default' : 'outline'}
                onClick={() => {
                  setValue('type', t);
                  setValue('status', t === 'INCOME' ? 'RECEIVED' : 'PAID');
                  if (t !== 'EXPENSE') setValue('installments', '1');
                }}
              >
                {TRANSACTION_TYPE_LABEL[t]}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-description">Descrição</Label>
            <Input id="tx-description" placeholder="Ex.: Mercado do mês" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Valor (R$)</Label>
              <Input id="tx-amount" placeholder="0,00" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date">Data</Label>
              <Input id="tx-date" type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          {type !== 'TRANSFER' && (
            <>
              <div className="space-y-2">
                <Label>{type === 'INCOME' ? 'Conta de destino' : 'Conta / Cartão'}</Label>
                <Select value={accountId} onValueChange={(v) => setValue('accountId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allPaymentOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} {a.type === 'CREDIT_CARD' ? '(cartão)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isCard && type === 'EXPENSE' && (
                <div className="space-y-2">
                  <Label htmlFor="tx-installments">Parcelas</Label>
                  <Select
                    value={watch('installments') ?? '1'}
                    onValueChange={(v) => setValue('installments', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTALLMENT_OPTIONS.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n === '1' ? 'À vista' : `${n}x`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={watch('categoryId') ?? ''}
                  onValueChange={(v) => setValue('categoryId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {type === 'TRANSFER' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>De</Label>
                <Select value={accountId} onValueChange={(v) => setValue('accountId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origem..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Para</Label>
                <Select
                  value={watch('transferToAccountId') ?? ''}
                  onValueChange={(v) => setValue('transferToAccountId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Pertence a</Label>
              <Select
                value={watch('ownerType') ?? 'SHARED'}
                onValueChange={(v) => setValue('ownerType', v as OwnerType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OWNER_TYPES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o === 'SHARED' ? 'Compartilhado' : o === 'USER_A' ? 'Meu' : 'Do cônjuge'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watch('status') ?? 'PAID'}
                onValueChange={(v) => setValue('status', v as TransactionStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TRANSACTION_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Select
                value={watch('recurrence') ?? 'ONCE'}
                onValueChange={(v) => setValue('recurrence', v as Recurrence)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_TYPES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {RECURRENCE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === 'EXPENSE' && (
            <div className="space-y-2">
              <Label>
                Pago por <span className="text-muted-foreground">(para a divisão do casal)</span>
              </Label>
              <Select
                value={watch('paidById') ?? ''}
                onValueChange={(v) => setValue('paidById', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Quem pagou?" />
                </SelectTrigger>
                <SelectContent>
                  {household?.users.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tx-tags">
              Tags <span className="text-muted-foreground">(separadas por vírgula)</span>
            </Label>
            <Input
              id="tx-tags"
              placeholder="Ex.: #Viagem2026, #Reforma"
              list="tx-tag-suggestions"
              {...register('tags')}
            />
            <datalist id="tx-tag-suggestions">
              {tags?.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : transaction ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
