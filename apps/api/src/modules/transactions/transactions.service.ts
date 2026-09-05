import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { addMonths, ownerTypesForVisibility, parseDateOnly } from '@finance/shared';
import type { Account, Prisma, Transaction } from '@finance/database';
import { PrismaService } from '../../common/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

const TX_INCLUDE = {
  category: { select: { id: true, name: true, color: true, icon: true } },
  account: { select: { id: true, name: true, type: true } },
  creditCard: { select: { id: true, name: true, type: true } },
  transferToAccount: { select: { id: true, name: true, type: true } },
  paidBy: { select: { id: true, name: true, memberRole: true } },
  tags: { include: { tag: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, q: QueryTransactionsDto) {
    const ownerTypes = ownerTypesForVisibility(user.memberRole, q.visibility ?? 'SELF');
    const where: Prisma.TransactionWhereInput = {
      householdId: user.householdId,
      ownerType: { in: ownerTypes },
    };

    if (q.year && q.month) {
      const start = new Date(q.year, q.month - 1, 1, 0, 0, 0, 0);
      const end = new Date(q.year, q.month, 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }    if (q.type) where.type = q.type;
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.accountId) {
      where.OR = [
        { accountId: q.accountId },
        { creditCardId: q.accountId },
        { transferToAccountId: q.accountId },
      ];
    }
    if (q.search) {
      where.description = { contains: q.search, mode: 'insensitive' };
    }

    const rows = await this.prisma.transaction.findMany({
      where,
      include: TX_INCLUDE,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    return rows.map((t) => this.serialize(t));
  }

  async findOne(user: AuthUser, id: string) {
    const tx = await this.getOwned(user, id);
    return this.serialize(tx);
  }

  async create(user: AuthUser, dto: CreateTransactionDto) {
    const date = parseDateOnly(dto.date);
    const base: Prisma.TransactionCreateInput = {
      household: { connect: { id: user.householdId } },
      ownerType: dto.ownerType,
      description: dto.description,
      amountCents: dto.amountCents,
      type: dto.type,
      date,
      status: dto.status ?? (dto.type === 'INCOME' ? 'RECEIVED' : 'PAID'),
      recurrence: dto.recurrence ?? 'ONCE',
      notes: dto.notes ?? null,
    };

    const tagIds = await this.findOrCreateTags(user.householdId, dto.tags);
    const tags = tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined;

    const rows: Prisma.TransactionCreateInput[] = [];

    if (dto.type === 'TRANSFER') {
      if (!dto.accountId || !dto.transferToAccountId || dto.accountId === dto.transferToAccountId) {
        throw new BadRequestException('Transferência exige conta de origem e destino diferentes');
      }
      const from = await this.getAccount(user, dto.accountId);
      const to = await this.getAccount(user, dto.transferToAccountId);
      if (from.type === 'CREDIT_CARD' || to.type === 'CREDIT_CARD') {
        throw new BadRequestException('Transferências não podem envolver cartão de crédito');
      }
      rows.push({
        ...base,
        account: { connect: { id: from.id } },
        transferToAccount: { connect: { id: to.id } },
        tags,
      });
    } else if (dto.type === 'INCOME') {
      if (!dto.accountId) throw new BadRequestException('Receita exige uma conta de destino');
      const account = await this.getAccount(user, dto.accountId);
      if (account.type === 'CREDIT_CARD') {
        throw new BadRequestException('Receita não pode ser lançada em cartão de crédito');
      }
      rows.push({
        ...base,
        amountCents: dto.amountCents,
        account: { connect: { id: account.id } },
        category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
        tags,
      });
    } else {
      // EXPENSE
      const payerId = await this.resolvePayer(user, dto.paidById);
      const paidBy = { connect: { id: payerId } };
      if (dto.creditCardId) {
        const card = await this.getAccount(user, dto.creditCardId);
        if (card.type !== 'CREDIT_CARD') {
          throw new BadRequestException('creditCardId deve referenciar um cartão');
        }
        const installments = Math.min(dto.installments ?? 1, 48);
        const installmentGroupId = installments > 1 ? randomUUID() : null;
        const perInstallment = Math.floor(dto.amountCents / installments);
        const amounts: number[] = [];
        for (let i = 0; i < installments; i++) {
          amounts.push(i === installments - 1 ? dto.amountCents - perInstallment * (installments - 1) : perInstallment);
        }
        for (let i = 0; i < installments; i++) {
          rows.push({
            ...base,
            amountCents: amounts[i],
            creditCard: { connect: { id: card.id } },
            paidBy,
            category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
            date: addMonths(date, i),
            installmentGroupId,
            installmentIndex: i + 1,
            installmentTotal: installments,
            tags,
          });
        }
      } else {
        if (!dto.accountId) {
          throw new BadRequestException('Despesa exige conta ou cartão de crédito');
        }
        const account = await this.getAccount(user, dto.accountId);
        rows.push({
          ...base,
          amountCents: dto.amountCents,
          account: { connect: { id: account.id } },
          paidBy,
          category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
          tags,
        });
      }
    }

    const created = await this.prisma.$transaction(rows.map((row) => this.prisma.transaction.create({ data: row })));
    const withDetails = await this.prisma.transaction.findMany({
      where: { id: { in: created.map((c) => c.id) } },
      include: TX_INCLUDE,
      orderBy: { date: 'asc' },
    });
    return withDetails.map((t) => this.serialize(t));
  }

  async update(user: AuthUser, id: string, dto: UpdateTransactionDto) {
    const existing = await this.getOwned(user, id);
    const editable = ownerTypesForVisibility(user.memberRole, 'SELF');
    if (!editable.includes(existing.ownerType)) {
      throw new ForbiddenException('Você não pode editar esta transação');
    }

    const data: Prisma.TransactionUpdateInput = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.amountCents !== undefined) data.amountCents = dto.amountCents;
    if (dto.date !== undefined) data.date = parseDateOnly(dto.date);
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.ownerType !== undefined) data.ownerType = dto.ownerType;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.recurrence !== undefined) data.recurrence = dto.recurrence;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId ? { connect: { id: dto.categoryId } } : { disconnect: true };
    }
    if (dto.accountId !== undefined) {
      data.account = dto.accountId ? { connect: { id: dto.accountId } } : { disconnect: true };
    }
    if (dto.creditCardId !== undefined) {
      data.creditCard = dto.creditCardId ? { connect: { id: dto.creditCardId } } : { disconnect: true };
    }
    if (dto.transferToAccountId !== undefined) {
      data.transferToAccount = dto.transferToAccountId ? { connect: { id: dto.transferToAccountId } } : { disconnect: true };
    }
    if (dto.paidById !== undefined) {
      const payerId = await this.resolvePayer(user, dto.paidById);
      data.paidBy = { connect: { id: payerId } };
    }
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (dto.tags !== undefined) {
      const tagIds = await this.findOrCreateTags(user.householdId, dto.tags);
      data.tags = {
        create: tagIds.map((tagId) => ({ tagId })),
      };
      ops.push(this.prisma.transactionTag.deleteMany({ where: { transactionId: id } }));
    }
    ops.push(this.prisma.transaction.update({ where: { id }, data }));
    await this.prisma.$transaction(ops);
    const updated = await this.prisma.transaction.findUnique({ where: { id }, include: TX_INCLUDE });
    return this.serialize(updated!);
  }

  async remove(user: AuthUser, id: string, deleteGroup?: boolean) {
    const existing = await this.getOwned(user, id);
    if (deleteGroup && existing.installmentGroupId) {
      await this.prisma.transaction.deleteMany({
        where: { householdId: user.householdId, installmentGroupId: existing.installmentGroupId },
      });
    } else {
      await this.prisma.transaction.delete({ where: { id } });
    }
    return { success: true };
  }

  async listTags(user: AuthUser) {
    return this.prisma.tag.findMany({
      where: { householdId: user.householdId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------

  private async getOwned(user: AuthUser, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, householdId: user.householdId },
      include: TX_INCLUDE,
    });
    if (!tx) {
      throw new NotFoundException('Transação não encontrada');
    }
    return tx;
  }

  private async getAccount(user: AuthUser, id: string): Promise<Account> {
    const account = await this.prisma.account.findFirst({
      where: { id, householdId: user.householdId, isArchived: false },
    });
    if (!account) {
      throw new BadRequestException('Conta inválida');
    }
    return account;
  }

  private async resolvePayer(user: AuthUser, paidById?: string): Promise<string> {
    const id = paidById ?? user.id;
    const payer = await this.prisma.user.findFirst({
      where: { id, householdId: user.householdId },
      select: { id: true },
    });
    if (!payer) {
      throw new BadRequestException('Pagador inválido');
    }
    return id;
  }

  private async findOrCreateTags(householdId: string, names?: string[]): Promise<string[]> {
    if (!names || names.length === 0) return [];
    const normalized = [...new Set(names.map((n) => n.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];
    if (normalized.length === 0) return [];
    const results: string[] = [];
    for (const name of normalized) {
      let tag = await this.prisma.tag.findUnique({ where: { householdId_name: { householdId, name } } });
      if (!tag) {
        tag = await this.prisma.tag.create({ data: { householdId, name } });
      }
      results.push(tag.id);
    }
    return results;
  }

  private serialize(t: Transaction & {
    category: { id: string; name: string; color: string | null; icon: string | null } | null;
    account: { id: string; name: string; type: string } | null;
    creditCard: { id: string; name: string; type: string } | null;
    transferToAccount: { id: string; name: string; type: string } | null;
    paidBy: { id: string; name: string; memberRole: string } | null;
    tags: { tag: { id: string; name: string } }[];
  }) {
    const { tags, ...rest } = t;
    return { ...rest, tags: tags.map((t) => t.tag.name) };
  }
}
