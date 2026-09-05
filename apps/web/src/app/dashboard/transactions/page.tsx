'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { formatBRL, type TransactionType } from '@finance/shared';
import { useVisibility } from '@/lib/visibility';
import { useDeleteTransaction, useTransactions } from '@/lib/queries/transactions';
import { useAccounts } from '@/lib/queries/accounts';
import { useCategories } from '@/lib/queries/transactions';
import type { Transaction } from '@/lib/types';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionDialog } from '@/components/transactions/transaction-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TransactionsPage() {
  const { visibility } = useVisibility();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [type, setType] = useState<string>('all');
  const [accountId, setAccountId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');

  const { data: transactions, isLoading, isError } = useTransactions({
    visibility,
    year,
    month,
    type: type === 'all' ? undefined : (type as TransactionType),
    accountId: accountId === 'all' ? undefined : accountId,
    categoryId: categoryId === 'all' ? undefined : categoryId,
    search: search || undefined,
  });

  const { data: accounts } = useAccounts('ALL');
  const { data: categories } = useCategories();

  const deleteTx = useDeleteTransaction();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions ?? []) {
      if (tx.type === 'INCOME') income += tx.amountCents;
      else if (tx.type === 'EXPENSE') expense += tx.amountCents;
    }
    return { income, expense, net: income - expense };
  }, [transactions]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setDialogOpen(true);
  };

  const handleDelete = (tx: Transaction) => {
    const isGroup = Boolean(tx.installmentTotal && tx.installmentTotal > 1);
    const message = isGroup
      ? `Excluir todas as ${tx.installmentTotal} parcelas de "${tx.description}"?`
      : `Excluir "${tx.description}"?`;
    if (window.confirm(message)) {
      void deleteTx.mutateAsync({ id: tx.id, deleteGroup: isGroup });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">Lançamentos de receitas, despesas e transferências.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova transação
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-emerald-600">{formatBRL(summary.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-red-600">{formatBRL(summary.expense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatBRL(summary.net)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border p-3">
        <div className="space-y-1">
          <LabelText>Mês</LabelText>
          <Input
            type="month"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, m] = e.target.value.split('-');
              setYear(Number(y));
              setMonth(Number(m));
            }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <LabelText>Tipo</LabelText>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="INCOME">Receita</SelectItem>
              <SelectItem value="EXPENSE">Despesa</SelectItem>
              <SelectItem value="TRANSFER">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <LabelText>Conta</LabelText>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {accounts?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <LabelText>Categoria</LabelText>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto space-y-1">
          <LabelText>Buscar</LabelText>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 pl-8"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Falha ao carregar transações.</p>
      ) : (
        <div className="rounded-xl border bg-card">
          <TransactionTable
            transactions={transactions ?? []}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} />
    </div>
  );
}

function LabelText({ children }: { children: ReactNode }) {
  return <span className="block pb-1 text-xs font-medium text-muted-foreground">{children}</span>;
}
