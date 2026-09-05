import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Budget, CreateGoalInput, SavingsGoal } from '@/lib/types';

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export const budgetKeys = {
  all: ['budgets'] as const,
  list: (year: number, month: number) => ['budgets', { year, month }] as const,
};

export function useBudgets(year: number, month: number) {
  return useQuery({
    queryKey: budgetKeys.list(year, month),
    queryFn: () => apiFetch<Budget[]>(`/budgets?year=${year}&month=${month}`),
  });
}

export interface CreateBudgetInput {
  categoryId: string;
  month: number;
  year: number;
  limitCents: number;
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBudgetInput) => apiFetch<Budget>('/budgets', { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { id: string; limitCents: number }) =>
      apiFetch<Budget>(`/budgets/${dto.id}`, { method: 'PATCH', body: { limitCents: dto.limitCents } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ success: boolean }>(`/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export const goalKeys = {
  all: ['goals'] as const,
};

export function useGoals() {
  return useQuery({
    queryKey: goalKeys.all,
    queryFn: () => apiFetch<SavingsGoal[]>('/goals'),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateGoalInput) => apiFetch<SavingsGoal>('/goals', { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateGoalInput & { id: string }) => {
      const { id, ...rest } = dto;
      return apiFetch<SavingsGoal>(`/goals/${id}`, { method: 'PATCH', body: rest });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ success: boolean }>(`/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, ...dto }: { goalId: string; amountCents: number; date?: string; notes?: string }) =>
      apiFetch(`/goals/${goalId}/contributions`, { method: 'POST', body: dto }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useRemoveContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) =>
      apiFetch(`/goals/${goalId}/contributions/${contributionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}
