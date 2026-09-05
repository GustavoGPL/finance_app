'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useAccounts, useArchiveAccount } from '@/lib/queries/accounts';
import { useVisibility } from '@/lib/visibility';
import type { Account } from '@/lib/types';
import { AccountCard } from '@/components/accounts/account-card';
import { AccountDialog } from '@/components/accounts/account-dialog';
import { Button } from '@/components/ui/button';

export default function AccountsPage() {
  const { visibility } = useVisibility();
  const { data: accounts, isLoading, isError } = useAccounts(visibility);
  const archiveAccount = useArchiveAccount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setDialogOpen(true);
  };

  const handleArchive = (account: Account) => {
    if (window.confirm(`Arquivar "${account.name}"? Ela deixará de aparecer nas listas.`)) {
      void archiveAccount.mutateAsync(account.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas e Cartões</h1>
          <p className="text-sm text-muted-foreground">Suas contas bancárias e cartões de crédito.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova conta
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Falha ao carregar contas.</p>
      ) : !accounts || accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium">Nenhuma conta ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira conta bancária ou cartão.</p>
          <Button className="mt-4" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova conta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={() => openEdit(account)}
              onArchive={() => handleArchive(account)}
            />
          ))}
        </div>
      )}

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} account={editing} />
    </div>
  );
}
