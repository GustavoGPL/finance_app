'use client';

import { CreditCard, PiggyBank, Pencil, TrendingUp, Wallet } from 'lucide-react';
import { formatBRL } from '@finance/shared';
import { ACCOUNT_TYPE_LABEL, OWNER_TYPE_LABEL, type Account } from '@/lib/types';
import { useInvoice } from '@/lib/queries/accounts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const TYPE_ICON = {
  CHECKING: Wallet,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  CREDIT_CARD: CreditCard,
} as const;

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

export function AccountCard({
  account,
  onEdit,
  onArchive,
}: {
  account: Account;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const Icon = TYPE_ICON[account.type];
  const isCard = account.type === 'CREDIT_CARD';
  const { data: invoice } = useInvoice(account.id, isCard);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium leading-none">{account.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{ACCOUNT_TYPE_LABEL[account.type]}</p>
          </div>
        </div>
        <Badge variant="secondary">{OWNER_TYPE_LABEL[account.ownerType]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {isCard ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Dívida atual</p>
              <p className="text-xl font-semibold">{formatBRL(account.debtCents)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Limite</p>
                <p className="font-medium">{formatBRL(account.creditLimitCents ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="font-medium">
                  {formatBRL((account.creditLimitCents ?? 0) - (account.debtCents - account.paidCents))}
                </p>
              </div>
            </div>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Fatura {invoice?.label ?? '...'}</span>
                {invoice && (
                  <span className="text-xs text-muted-foreground">
                    vence {dateFmt.format(new Date(invoice.period.dueDate))}
                  </span>
                )}
              </div>
              <p className="mt-1 font-semibold">{invoice ? formatBRL(invoice.totalCents) : '—'}</p>
              {account.closingDay && account.dueDay && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Fecha dia {account.closingDay} · vence dia {account.dueDay}
                </p>
              )}
            </div>
          </>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className="text-xl font-semibold">{formatBRL(account.balanceCents)}</p>
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            className="text-muted-foreground hover:text-destructive"
          >
            Arquivar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
