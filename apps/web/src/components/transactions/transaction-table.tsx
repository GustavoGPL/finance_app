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
        {transactions.map((tx) => {
          const typeIcon =
            tx.type === 'INCOME' ? (
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            ) : tx.type === 'EXPENSE' ? (
              <ArrowUpRight className="h-4 w-4 text-red-600" />
            ) : (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            );
          const source = tx.creditCard?.name ?? tx.account?.name ?? '—';
          const installment =
            tx.installmentTotal ? ` · parcela ${tx.installmentIndex}/${tx.installmentTotal}` : '';

          return (
            <TableRow key={tx.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {dateFmt.format(new Date(tx.date))}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {typeIcon}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tx.description}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      {tx.installmentTotal && (
                        <span className="text-xs text-muted-foreground">{installment}</span>
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
              <TableCell className="whitespace-nowrap">
                {tx.category ? (
                  <span className="flex items-center gap-1.5">
                    {tx.category.color && (
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: tx.category.color }}
                      />
                    )}
                    <span className="text-muted-foreground">{tx.category.name}</span>
                  </span>
                ) : tx.type === 'TRANSFER' ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    Transferência
                    <ArrowRight className="h-3 w-3" />
                    {tx.transferToAccount?.name ?? ''}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{source}</TableCell>
              <TableCell className="text-right">
                <Value tx={tx} />
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    tx.status === 'PAID' || tx.status === 'RECEIVED' ? 'secondary' : 'outline'
                  }
                >
                  {TRANSACTION_STATUS_LABEL[tx.status]}
                </Badge>
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
          );
        })}
      </TableBody>
    </Table>
  );
}

export { TRANSACTION_TYPE_LABEL };
