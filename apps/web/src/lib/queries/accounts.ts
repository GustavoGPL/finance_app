import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Visibility } from '@finance/shared';
import { apiFetch } from '@/lib/api';
import type { Account, CreateAccountInput, Invoice } from '@/lib/types';

export const accountKeys = {
  all: ['accounts'] as const,
  list: (visibility: Visibility) => ['accounts', { visibility }] as const,
  detail: (id: string) => ['accounts', id] as const,
  invoice: (id: string) => ['accounts', id, 'invoice'] as const,
};

export function useAccounts(visibility: Visibility) {
  return useQuery({
    queryKey: accountKeys.list(visibility),
    queryFn: () => apiFetch<Account[]>(`/accounts?visibility=${visibility}`),
  });
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: accountKeys.detail(id ?? ''),
    queryFn: () => apiFetch<Account>(`/accounts/${id}`),
    enabled: Boolean(id),
  });
}

export function useInvoice(accountId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: accountKeys.invoice(accountId ?? ''),
    queryFn: () => apiFetch<Invoice>(`/accounts/${accountId}/invoice`),
    enabled: enabled && Boolean(accountId),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAccountInput) =>
      apiFetch<Account>('/accounts', { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAccountInput & { id: string }) => {
      const { id, ...rest } = dto;
      return apiFetch<Account>(`/accounts/${id}`, { method: 'PATCH', body: rest });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useArchiveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ success: boolean }>(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
