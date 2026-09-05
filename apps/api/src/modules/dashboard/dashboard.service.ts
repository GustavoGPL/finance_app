import { Injectable } from '@nestjs/common';
import { getBillingWindow, ownerTypesForVisibility } from '@finance/shared';
import type { Visibility } from '@finance/shared';
import type { OwnerType } from '@finance/shared';
import { PrismaService } from '../../common/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

interface DashboardQuery {
  year?: number;
  month?: number;
  visibility?: Visibility;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser, q: DashboardQuery) {
    const now = new Date();
    const year = q.year ?? now.getFullYear();
    const month = q.month ?? now.getMonth() + 1;
    const visibility = q.visibility ?? 'SELF';
    const ownerTypes = ownerTypesForVisibility(user.memberRole, visibility);

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          householdId: user.householdId,
          ownerType: { in: ownerTypes },
          type: 'INCOME',
          date: { gte: start, lte: end },
        },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          householdId: user.householdId,
          ownerType: { in: ownerTypes },
          type: 'EXPENSE',
          date: { gte: start, lte: end },
        },
        _sum: { amountCents: true },
      }),
    ]);

    const incomeCents = incomeAgg._sum.amountCents ?? 0;
    const expenseCents = expenseAgg._sum.amountCents ?? 0;
    const [cashTotalCents, debtTotalCents] = await this.currentCashAndDebt(user.householdId, ownerTypes);

    return {
      year,
      month,
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
      cashTotalCents,
      debtTotalCents,
      upcoming: await this.upcomingPayments(user, ownerTypes, 7),
    };
  }

  async categories(user: AuthUser, q: DashboardQuery) {
    const now = new Date();
    const year = q.year ?? now.getFullYear();
    const month = q.month ?? now.getMonth() + 1;
    const ownerTypes = ownerTypesForVisibility(user.memberRole, q.visibility ?? 'SELF');
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [expenses, categories] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          householdId: user.householdId,
          ownerType: { in: ownerTypes },
          type: 'EXPENSE',
          categoryId: { not: null },
          date: { gte: start, lte: end },
        },
        select: { amountCents: true, categoryId: true },
      }),
      this.prisma.category.findMany({
        where: { householdId: user.householdId },
        select: { id: true, name: true, parentId: true, color: true },
      }),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const totals = new Map<string, { id: string; name: string; color: string | null; totalCents: number; count: number }>();

    for (const tx of expenses) {
      let cursor = catMap.get(tx.categoryId as string) ?? null;
      const seen = new Set<string>();
      while (cursor && cursor.parentId && !seen.has(cursor.id)) {
        seen.add(cursor.id);
        cursor = catMap.get(cursor.parentId) ?? null;
      }
      const root = cursor;
      if (!root) continue;
      const entry = totals.get(root.id) ?? {
        id: root.id,
        name: root.name,
        color: root.color,
        totalCents: 0,
        count: 0,
      };
      entry.totalCents += tx.amountCents;
      entry.count += 1;
      totals.set(root.id, entry);
    }

    const result = [...totals.values()].sort((a, b) => b.totalCents - a.totalCents);
    const grandTotal = result.reduce((s, r) => s + r.totalCents, 0);
    return {
      totalCents: grandTotal,
      items: result.map((r) => ({ ...r, percent: grandTotal > 0 ? Math.round((r.totalCents / grandTotal) * 100) : 0 })),
    };
  }

  async netWorth(user: AuthUser, months: number, visibility: Visibility) {
    const ownerTypes = ownerTypesForVisibility(user.memberRole, visibility ?? 'SELF');
    const [accounts, cards] = await Promise.all([
      this.prisma.account.findMany({
        where: { householdId: user.householdId, isArchived: false, type: { not: 'CREDIT_CARD' }, ownerType: { in: ownerTypes } },
        select: { id: true, initialBalanceCents: true },
      }),
      this.prisma.account.findMany({
        where: { householdId: user.householdId, isArchived: false, type: 'CREDIT_CARD', ownerType: { in: ownerTypes } },
        select: { id: true },
      }),
    ]);

    const now = new Date();
    const boundaries: Date[] = [];
    const labels: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const y = now.getFullYear();
      const m = now.getMonth() - i;
      const date = new Date(y, m + 1, 0, 23, 59, 59, 999);
      boundaries.push(date);
      labels.push(`${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`);
    }

    const allTx = await this.prisma.transaction.findMany({
      where: { householdId: user.householdId, ownerType: { in: ownerTypes }, date: { lte: boundaries[boundaries.length - 1] } },
      select: {
        amountCents: true,
        type: true,
        date: true,
        accountId: true,
        creditCardId: true,
        transferToAccountId: true,
      },
    });

    const cardIds = cards.map((c) => c.id);

    const result = boundaries.map((d, idx) => {      const inWindow = allTx.filter((t) => t.date <= d);
      let cashCents = 0;
      for (const acc of accounts) {
        let balance = acc.initialBalanceCents;
        for (const t of inWindow) {
          if (t.accountId === acc.id) {
            if (t.type === 'INCOME') balance += t.amountCents;
            else if (t.type === 'EXPENSE' || t.type === 'TRANSFER') balance -= t.amountCents;
          }
          if (t.type === 'TRANSFER' && t.transferToAccountId === acc.id) {
            balance += t.amountCents;
          }
        }
        cashCents += balance;
      }
      let debtCents = 0;
      for (const cardId of cardIds) {
        for (const t of inWindow) {
          if (t.creditCardId === cardId) debtCents += t.amountCents;
          if (t.type === 'TRANSFER' && t.transferToAccountId === cardId) debtCents -= t.amountCents;
        }
      }
      return {
        label: labels[idx],
        year: boundaries[idx].getFullYear(),
        month: boundaries[idx].getMonth() + 1,
        cashCents,
        debtCents,
        netCents: cashCents - debtCents,
      };
    });

    return result;
  }

  async coupleSplit(user: AuthUser, q: DashboardQuery) {
    const now = new Date();
    const year = q.year ?? now.getFullYear();
    const month = q.month ?? now.getMonth() + 1;
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [members, sharedTx] = await Promise.all([
      this.prisma.user.findMany({
        where: { householdId: user.householdId },
        select: { id: true, name: true, memberRole: true },
        orderBy: { memberRole: 'asc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          householdId: user.householdId,
          ownerType: 'SHARED',
          type: 'EXPENSE',
          paidById: { not: null },
          date: { gte: start, lte: end },
        },
        select: { amountCents: true, paidById: true },
      }),
    ]);

    const paidByUser = new Map<string, number>();
    for (const tx of sharedTx) {
      paidByUser.set(tx.paidById as string, (paidByUser.get(tx.paidById as string) ?? 0) + tx.amountCents);
    }

    const totalSharedCents = sharedTx.reduce((s, t) => s + t.amountCents, 0);
    const equalShareCents = Math.round(totalSharedCents / 2);

    const breakdown = members.map((m) => {
      const paidCents = paidByUser.get(m.id) ?? 0;
      return {
        userId: m.id,
        name: m.name,
        memberRole: m.memberRole,
        paidCents,
        balanceCents: paidCents - equalShareCents,
      };
    });

    return { totalSharedCents, equalShareCents, members: breakdown };
  }

  // ---------------------------------------------------------------------------

  private async upcomingPayments(
    user: AuthUser,
    ownerTypes: OwnerType[],
    days: number,
  ) {
    const today = new Date();
    const maxDate = new Date(today.getTime() + days * 86_400_000);
    const items: {
      kind: 'bill' | 'invoice';
      id: string;
      description: string;
      dueDate: Date;
      amountCents: number;
    }[] = [];

    const pendingBills = await this.prisma.transaction.findMany({
      where: {
        householdId: user.householdId,
        ownerType: { in: ownerTypes },
        type: 'EXPENSE',
        status: 'PENDING',
        accountId: { not: null },
        date: { gte: today, lte: maxDate },
      },
      select: { id: true, description: true, amountCents: true, date: true },
      orderBy: { date: 'asc' },
    });
    for (const b of pendingBills) {
      items.push({ kind: 'bill', id: b.id, description: b.description, dueDate: b.date, amountCents: b.amountCents });
    }

    const cards = await this.prisma.account.findMany({
      where: { householdId: user.householdId, isArchived: false, type: 'CREDIT_CARD', ownerType: { in: ownerTypes } },
      select: { id: true, name: true, closingDay: true, dueDay: true },
    });

    for (const card of cards) {
      if (!card.closingDay || !card.dueDay) continue;
      for (const offset of [0, 1]) {
        const due = new Date(today.getFullYear(), today.getMonth() + offset, card.dueDay, 12, 0, 0, 0);
        if (due < today || due > maxDate) continue;
        const window = getBillingWindow(today.getFullYear(), today.getMonth() + offset - 1, card.closingDay, card.dueDay);
        const agg = await this.prisma.transaction.aggregate({
          where: {
            householdId: user.householdId,
            creditCardId: card.id,
            date: { gte: window.start, lte: window.end },
          },
          _sum: { amountCents: true },
        });
        const total = agg._sum.amountCents ?? 0;
        if (total > 0) {
          items.push({
            kind: 'invoice',
            id: card.id,
            description: `Fatura ${card.name}`,
            dueDate: due,
            amountCents: total,
          });
        }
      }
    }

    return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  private async currentCashAndDebt(householdId: string, ownerTypes: OwnerType[]) {
    const accounts = await this.prisma.account.findMany({
      where: { householdId, isArchived: false, ownerType: { in: ownerTypes } },
      select: { id: true, type: true, initialBalanceCents: true },
    });

    const [incomeByAccount, outflowByAccount, inflowByAccount, cardTx, cardPayments] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['accountId'],
        where: { householdId, type: 'INCOME', accountId: { in: accounts.filter((a) => a.type !== 'CREDIT_CARD').map((a) => a.id) } },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['accountId'],
        where: { householdId, type: { in: ['EXPENSE', 'TRANSFER'] }, accountId: { in: accounts.filter((a) => a.type !== 'CREDIT_CARD').map((a) => a.id) } },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['transferToAccountId'],
        where: { householdId, type: 'TRANSFER', transferToAccountId: { in: accounts.filter((a) => a.type !== 'CREDIT_CARD').map((a) => a.id) } },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['creditCardId'],
        where: { householdId, creditCardId: { in: accounts.filter((a) => a.type === 'CREDIT_CARD').map((a) => a.id) } },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['transferToAccountId'],
        where: { householdId, type: 'TRANSFER', transferToAccountId: { in: accounts.filter((a) => a.type === 'CREDIT_CARD').map((a) => a.id) } },
        _sum: { amountCents: true },
      }),
    ]);

    let cashTotal = 0;
    let debtTotal = 0;
    type AggRow = { _sum: { amountCents: number | null } | null } & Record<
      'accountId' | 'transferToAccountId' | 'creditCardId',
      string | null
    >;
    const toMap = (
      rows: AggRow[],
      key: 'accountId' | 'transferToAccountId' | 'creditCardId',
    ) => {
      const map = new Map<string, number>();
      for (const r of rows) {
        const id = r[key];
        if (id) map.set(id, r._sum?.amountCents ?? 0);
      }
      return map;
    };

    const income = toMap(incomeByAccount as AggRow[], 'accountId');
    const outflow = toMap(outflowByAccount as AggRow[], 'accountId');
    const inflow = toMap(inflowByAccount as AggRow[], 'transferToAccountId');
    const cardDebt = toMap(cardTx as AggRow[], 'creditCardId');
    const cardPaid = toMap(cardPayments as AggRow[], 'transferToAccountId');

    for (const acc of accounts) {
      if (acc.type === 'CREDIT_CARD') {
        debtTotal += (cardDebt.get(acc.id) ?? 0) - (cardPaid.get(acc.id) ?? 0);
      } else {
        cashTotal += acc.initialBalanceCents + (income.get(acc.id) ?? 0) - (outflow.get(acc.id) ?? 0) + (inflow.get(acc.id) ?? 0);
      }
    }

    return [cashTotal, debtTotal] as const;
  }
}
