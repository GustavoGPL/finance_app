import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

const BUDGET_INCLUDE = {
  category: { select: { id: true, name: true, color: true, icon: true, type: true } },
} as const;

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, year: number, month: number) {
    const budgets = await this.prisma.budget.findMany({
      where: { householdId: user.householdId, year, month },
      include: BUDGET_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const withProgress = await Promise.all(
      budgets.map(async (budget) => {
        const childIds = (
          await this.prisma.category.findMany({
            where: { householdId: user.householdId, parentId: budget.categoryId },
            select: { id: true },
          })
        ).map((c) => c.id);
        const agg = await this.prisma.transaction.aggregate({
          where: {
            householdId: user.householdId,
            type: 'EXPENSE',
            categoryId: { in: [budget.categoryId, ...childIds] },
            date: { gte: start, lte: end },
          },
          _sum: { amountCents: true },
        });
        return { ...budget, spentCents: agg._sum.amountCents ?? 0 };
      }),
    );

    return withProgress;
  }

  async create(user: AuthUser, dto: CreateBudgetDto) {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, householdId: user.householdId },
    });
    if (!category) {
      throw new BadRequestException('Categoria inválida');
    }
    if (category.type !== 'EXPENSE') {
      throw new BadRequestException('Orçamentos são apenas para categorias de despesa');
    }
    const exists = await this.prisma.budget.findUnique({
      where: {
        householdId_categoryId_month_year: {
          householdId: user.householdId,
          categoryId: dto.categoryId,
          month: dto.month,
          year: dto.year,
        },
      },
    });
    if (exists) {
      throw new ConflictException('Já existe um orçamento para esta categoria no mês');
    }
    return this.prisma.budget.create({
      data: {
        householdId: user.householdId,
        categoryId: dto.categoryId,
        month: dto.month,
        year: dto.year,
        limitCents: dto.limitCents,
      },
      include: BUDGET_INCLUDE,
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateBudgetDto) {
    await this.getOwned(user, id);
    return this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.limitCents !== undefined && { limitCents: dto.limitCents }),
        ...(dto.month !== undefined && { month: dto.month }),
        ...(dto.year !== undefined && { year: dto.year }),
      },
      include: BUDGET_INCLUDE,
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.getOwned(user, id);
    await this.prisma.budget.delete({ where: { id } });
    return { success: true };
  }

  private async getOwned(user: AuthUser, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, householdId: user.householdId },
    });
    if (!budget) {
      throw new NotFoundException('Orçamento não encontrado');
    }
    return budget;
  }
}
