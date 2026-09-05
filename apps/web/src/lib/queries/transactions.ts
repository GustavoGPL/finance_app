import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TransactionType, Visibility } from '@finance/shared';
import { apiFetch } from '@/lib/api';
import type { Category, CreateTransactionInput, Tag, Transaction } from '@/lib/types';

export interface TransactionFilters {
  visibility: Visibility;
  year?: number;
  month?: number;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  search?: string;
}

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionFilters) => ['transactions', filters] as const,
  tags: ['transactions', 'tags'] as const,
};

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams({ visibility: filters.visibility });
  if (filters.year) params.set('year', String(filters.year));
  if (filters.month) params.set('month', String(filters.month));
  if (filters.type) params.set('type', filters.type);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.search) params.set('search', filters.search);
  return params.toString();
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => apiFetch<Transaction[]>(`/transactions?${buildQuery(filters)}`),
  });
}

export function useCategories(type?: 'INCOME' | 'EXPENSE') {
  return useQuery({
    queryKey: ['categories', type ?? 'all'],
    queryFn: () => apiFetch<Category[]>(`/categories${type ? `?type=${type}` : ''}`),
  });
}

export function useTags() {
  return useQuery({
    queryKey: transactionKeys.tags,
    queryFn: () => apiFetch<Tag[]>('/transactions/tags'),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionInput) =>
      apiFetch<Transaction[]>('/transactions', { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: transactionKeys.all });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionInput & { id: string }) => {
      const { id, ...rest } = dto;
      return apiFetch<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: rest });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: transactionKeys.all });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteGroup }: { id: string; deleteGroup?: boolean }) =>
      apiFetch<{ success: boolean }>(
        `/transactions/${id}${deleteGroup ? '?deleteGroup=true' : ''}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: transactionKeys.all });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
