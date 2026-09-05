import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ownerTypesForVisibility, getBillingWindow, type Visibility } from '@finance/shared';
import type { Account } from '@finance/database';
import { PrismaService } from '../../common/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

const ACCOUNT_INCLUDE = {
  _count: { select: { transactions: true } },
} as const;

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, visibility: Visibility) {
    const ownerTypes = ownerTypesForVisibility(user.memberRole, visibility);
    const accounts = await this.prisma.account.findMany({
      where: {
        householdId: user.householdId,
        isArchived: false,
        ownerType: { in: ownerTypes },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: ACCOUNT_INCLUDE,
    });
    const balances = await this.computeBalances(user.householdId, accounts);
    return accounts.map((acc) => ({
      ...acc,
      balanceCents: balances[acc.id]?.balanceCents ?? acc.initialBalanceCents,
      debtCents: balances[acc.id]?.debtCents ?? 0,
      paidCents: balances[acc.id]?.paidCents ?? 0,
    }));
  }

  async findOne(user: AuthUser, id: string) {
    const account = await this.getOwnedAccount(user, id);
    const balances = await this.computeBalances(user.householdId, [account]);
    return {
      ...account,
      balanceCents: balances[account.id]?.balanceCents ?? account.initialBalanceCents,
      debtCents: balances[account.id]?.debtCents ?? 0,
      paidCents: balances[account.id]?.paidCents ?? 0,
    };
  }

  async create(user: AuthUser, dto: CreateAccountDto) {
    this.assertCardFields(dto.type, dto);
    const account = await this.prisma.account.create({
      data: {
        householdId: user.householdId,
        name: dto.name,
        type: dto.type,
        ownerType: dto.ownerType,
        initialBalanceCents: dto.initialBalanceCents ?? 0,
        currency: dto.currency ?? 'BRL',
        creditLimitCents: dto.creditLimitCents,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
      },
      include: ACCOUNT_INCLUDE,
    });
    return {
      ...account,
      balanceCents: account.initialBalanceCents,
      debtCents: 0,
      paidCents: 0,
    };
  }

  async update(user: AuthUser, id: string, dto: UpdateAccountDto) {
    const existing = await this.getEditableAccount(user, id);
    const type = dto.type ?? existing.type;
    this.assertCardFields(type, { ...existing, ...dto });
    const account = await this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.ownerType !== undefined && { ownerType: dto.ownerType }),
        ...(dto.initialBalanceCents !== undefined && { initialBalanceCents: dto.initialBalanceCents }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.creditLimitCents !== undefined && { creditLimitCents: dto.creditLimitCents }),
        ...(dto.closingDay !== undefined && { closingDay: dto.closingDay }),
        ...(dto.dueDay !== undefined && { dueDay: dto.dueDay }),
      },
      include: ACCOUNT_INCLUDE,
    });
    const balances = await this.computeBalances(user.householdId, [account]);
    return {
      ...account,
      balanceCents: balances[account.id]?.balanceCents ?? account.initialBalanceCents,
      debtCents: balances[account.id]?.debtCents ?? 0,
      paidCents: balances[account.id]?.paidCents ?? 0,
    };
  }

  async archive(user: AuthUser, id: string) {
    await this.getEditableAccount(user, id);
    await this.prisma.account.update({ where: { id }, data: { isArchived: true } });
    return { success: true };
  }

  async getInvoice(user: AuthUser, id: string, year?: number, month?: number) {
    const account = await this.getOwnedAccount(user, id);
    if (account.type !== 'CREDIT_CARD' || !account.closingDay || !account.dueDay) {
      throw new BadRequestException('Conta não é um cartão de crédito válido');
    }

    const period = this.resolvePeriod(account, year, month);
    const { start, end, dueDate, label } = getBillingWindow(
      period.year,
      period.month,
      account.closingDay,
      account.dueDay,
    );

    const [transactions, payments] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          householdId: user.householdId,
          creditCardId: id,
          date: { gte: start, lte: end },
        },
        include: { category: { select: { id: true, name: true, color: true, icon: true } }, tags: { include: { tag: { select: { id: true, name: true } } } } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          householdId: user.householdId,
          type: 'TRANSFER',
          transferToAccountId: id,
          date: { gte: start, lte: end },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    const totalCents = transactions.reduce((sum, t) => sum + t.amountCents, 0);
    const paidCents = payments.reduce((sum, t) => sum + t.amountCents, 0);

    return {
      accountId: account.id,
      label,
      period: { start, end, dueDate },
      totalCents,
      paidCents,
      remainingCents: totalCents - paidCents,
      creditLimitCents: account.creditLimitCents ?? 0,
      availableCreditCents: (account.creditLimitCents ?? 0) - (totalCents - paidCents),
      transactions: transactions.map((t) => ({
        id: t.id,
        description: t.description,
        amountCents: t.amountCents,
        date: t.date,
        status: t.status,
        installmentIndex: t.installmentIndex,
        installmentTotal: t.installmentTotal,
        category: t.category,
        tags: t.tags.map((tt) => tt.tag.name),
      })),
      payments: payments.map((p) => ({
        id: p.id,
        description: p.description,
        amountCents: p.amountCents,
        date: p.date,
      })),
    };
  }

  // ---------------------------------------------------------------------------

  private async getOwnedAccount(user: AuthUser, id: string): Promise<Account> {
    const account = await this.prisma.account.findFirst({
      where: { id, householdId: user.householdId, isArchived: false },
    });
    if (!account) {
      throw new NotFoundException('Conta não encontrada');
    }
    return account;
  }

  private async getEditableAccount(user: AuthUser, id: string): Promise<Account> {
    const account = await this.getOwnedAccount(user, id);
    const editable = ownerTypesForVisibility(user.memberRole, 'SELF');
    if (!editable.includes(account.ownerType)) {
      throw new ForbiddenException('Você não pode editar esta conta');
    }
    return account;
  }

  private assertCardFields(
    type: Account['type'],
    dto: { creditLimitCents?: number | null; closingDay?: number | null; dueDay?: number | null },
  ) {
    if (type !== 'CREDIT_CARD') {
      return;
    }
    if (!dto.creditLimitCents || !dto.closingDay || !dto.dueDay) {
      throw new BadRequestException(
        'Cartão de crédito exige creditLimitCents, closingDay e dueDay',
      );
    }
  }

  private resolvePeriod(
    account: Account,
    year?: number,
    month?: number,
  ): { year: number; month: number } {
    if (year !== undefined && month !== undefined) {
      return { year, month };
    }
    const now = new Date();
    if (now.getDate() <= (account.closingDay ?? 1)) {
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  }

  private async computeBalances(householdId: string, accounts: Account[]) {
    const result: Record<string, { balanceCents: number; debtCents: number; paidCents: number }> = {};

    for (const acc of accounts) {
      if (acc.type === 'CREDIT_CARD') {
        const [debtAgg, paidAgg] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: { householdId, creditCardId: acc.id },
            _sum: { amountCents: true },
          }),
          this.prisma.transaction.aggregate({
            where: { householdId, type: 'TRANSFER', transferToAccountId: acc.id },
            _sum: { amountCents: true },
          }),
        ]);
        const debtCents = debtAgg._sum.amountCents ?? 0;
        const paidCents = paidAgg._sum.amountCents ?? 0;
        result[acc.id] = { balanceCents: debtCents - paidCents, debtCents, paidCents };
      } else {
        const [incomeAgg, outflowAgg, inflowAgg] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: { householdId, type: 'INCOME', accountId: acc.id },
            _sum: { amountCents: true },
          }),
          this.prisma.transaction.aggregate({
            where: { householdId, type: { in: ['EXPENSE', 'TRANSFER'] }, accountId: acc.id },
            _sum: { amountCents: true },
          }),
          this.prisma.transaction.aggregate({
            where: { householdId, type: 'TRANSFER', transferToAccountId: acc.id },
            _sum: { amountCents: true },
          }),
        ]);
        const balanceCents =
          acc.initialBalanceCents +
          (incomeAgg._sum.amountCents ?? 0) -
          (outflowAgg._sum.amountCents ?? 0) +
          (inflowAgg._sum.amountCents ?? 0);
        result[acc.id] = { balanceCents, debtCents: 0, paidCents: 0 };
      }
    }
    return result;
  }
}
