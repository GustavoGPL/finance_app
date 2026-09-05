import { useQuery } from '@tanstack/react-query';
import type { MemberRole, Visibility } from '@finance/shared';
import { apiFetch } from '@/lib/api';

export interface UpcomingItem {
  kind: 'bill' | 'invoice';
  id: string;
  description: string;
  dueDate: string;
  amountCents: number;
}

export interface DashboardOverview {
  year: number;
  month: number;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  cashTotalCents: number;
  debtTotalCents: number;
  upcoming: UpcomingItem[];
}

export interface CategoryBreakdownItem {
  id: string;
  name: string;
  color: string | null;
  totalCents: number;
  count: number;
  percent: number;
}

export interface CategoryBreakdown {
  totalCents: number;
  items: CategoryBreakdownItem[];
}

export interface NetWorthPoint {
  label: string;
  year: number;
  month: number;
  cashCents: number;
  debtCents: number;
  netCents: number;
}

export interface CoupleSplitMember {
  userId: string;
  name: string;
  memberRole: MemberRole;
  paidCents: number;
  balanceCents: number;
}

export interface CoupleSplit {
  totalSharedCents: number;
  equalShareCents: number;
  members: CoupleSplitMember[];
}

const dashboardKeys = {
  overview: (p: Record<string, unknown>) => ['dashboard', 'overview', p],
  categories: (p: Record<string, unknown>) => ['dashboard', 'categories', p],
  netWorth: (p: Record<string, unknown>) => ['dashboard', 'net-worth', p],
  coupleSplit: (p: Record<string, unknown>) => ['dashboard', 'couple-split', p],
};

export function useOverview(year: number, month: number, visibility: Visibility) {
  return useQuery({
    queryKey: dashboardKeys.overview({ year, month, visibility }),
    queryFn: () =>
      apiFetch<DashboardOverview>(
        `/dashboard/overview?year=${year}&month=${month}&visibility=${visibility}`,
      ),
  });
}

export function useCategoryBreakdown(year: number, month: number, visibility: Visibility) {
  return useQuery({
    queryKey: dashboardKeys.categories({ year, month, visibility }),
    queryFn: () =>
      apiFetch<CategoryBreakdown>(
        `/dashboard/categories?year=${year}&month=${month}&visibility=${visibility}`,
      ),
  });
}

export function useNetWorth(months: number, visibility: Visibility) {
  return useQuery({
    queryKey: dashboardKeys.netWorth({ months, visibility }),
    queryFn: () => apiFetch<NetWorthPoint[]>(`/dashboard/net-worth?months=${months}&visibility=${visibility}`),
  });
}

export function useCoupleSplit(year: number, month: number) {
  return useQuery({
    queryKey: dashboardKeys.coupleSplit({ year, month }),
    queryFn: () => apiFetch<CoupleSplit>(`/dashboard/couple-split?year=${year}&month=${month}`),
  });
}
