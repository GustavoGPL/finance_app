'use client';

import { ArrowRight, ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { formatBRL } from '@finance/shared';
import type { Transaction } from '@/lib/types';
import { TRANSACTION_STATUS_LABEL, TRANSACTION_TYPE_LABEL } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

function Value({ tx }: { tx: Transaction }) {
  const sign = tx.type === 'INCOME' ? '+' : '-';
  const color =
    tx.type === 'INCOME'
      ? 'text-emerald-600'
      : tx.type === 'EXPENSE'
        ? 'text-red-600'
        : 'text-muted-foreground';
  return <span className={cn('font-medium tabular-nums', color)}>{sign} {formatBRL(tx.amountCents)}</span>;
}

function TypeIcon({ tx }: { tx: Transaction }) {
  const Icon =
    tx.type === 'INCOME' ? (
      <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-600" />
    ) : tx.type === 'EXPENSE' ? (
      <ArrowUpRight className="h-4 w-4 shrink-0 text-red-600" />
    ) : (
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    );
  return Icon;
}

function Source({ tx }: { tx: Transaction }) {
  const source = tx.creditCard?.name ?? tx.account?.name ?? '—';
  return <span className="whitespace-nowrap text-muted-foreground">{source}</span>;
}

function CategoryCell({ tx }: { tx: Transaction }) {
  if (tx.category) {
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        {tx.category.color && (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: tx.category.color }}
          />
        )}
        <span className="text-muted-foreground">{tx.category.name}</span>
      </span>
    );
  }
  if (tx.type === 'TRANSFER') {
    return (
      <span className="flex items-center gap-1 whitespace-nowrap text-muted-foreground">
        Transferência
        <ArrowRight className="h-3 w-3 shrink-0" />
        {tx.transferToAccount?.name ?? ''}
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function StatusBadge({ tx }: { tx: Transaction }) {
  return (
    <Badge variant={tx.status === 'PAID' || tx.status === 'RECEIVED' ? 'secondary' : 'outline'}>
      {TRANSACTION_STATUS_LABEL[tx.status]}
    </Badge>
  );
}

function MobileCard({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  const installment =
    tx.installmentTotal ? ` · parcela ${tx.installmentIndex}/${tx.installmentTotal}` : '';

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <TypeIcon tx={tx} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-medium">{tx.description}</p>
            <span className="shrink-0">
              <Value tx={tx} />
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dateFmt.format(new Date(tx.date))}
            {installment}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="flex min-w-0 items-center gap-1.5 text-xs">
              {tx.type === 'TRANSFER' && tx.account && (
                <span className="truncate text-muted-foreground">de {tx.account.name}</span>
              )}
              <CategoryCell tx={tx} />
              {tx.type !== 'TRANSFER' && <Source tx={tx} />}
            </span>
            <StatusBadge tx={tx} />
          </div>
          {tx.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {tx.tags.map((tag) => (
                <span key={tag} className="text-xs text-primary">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(tx)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(tx)}
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center">
        <p className="text-sm font-medium">Nenhuma transação encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou crie uma nova transação.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y md:hidden">
        {transactions.map((tx) => (
          <MobileCard key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {dateFmt.format(new Date(tx.date))}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TypeIcon tx={tx} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tx.description}</p>
                      <div className="flex flex-wrap items-center gap-1">
                        {tx.installmentTotal && (
                          <span className="text-xs text-muted-foreground">
                            parcela {tx.installmentIndex}/{tx.installmentTotal}
                          </span>
                        )}
                        {tx.tags.map((tag) => (
                          <span key={tag} className="text-xs text-primary">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <CategoryCell tx={tx} />
                </TableCell>
                <TableCell>
                  <Source tx={tx} />
                </TableCell>
                <TableCell className="text-right">
                  <Value tx={tx} />
                </TableCell>
                <TableCell>
                  <StatusBadge tx={tx} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(tx)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(tx)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export { TRANSACTION_TYPE_LABEL };
