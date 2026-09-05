import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AddContributionDto } from './dto/add-contribution.dto';

const CONTRIBUTION_SELECT = {
  id: true,
  amountCents: true,
  date: true,
  notes: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
} as const;

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { householdId: user.householdId },
      include: { contributions: { select: CONTRIBUTION_SELECT, orderBy: { date: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return goals.map((g) => ({
      ...g,
      progressPercent:
        g.targetCents > 0 ? Math.min(100, Math.round((g.currentCents / g.targetCents) * 100)) : 0,
    }));
  }

  async create(user: AuthUser, dto: CreateGoalDto) {
    const goal = await this.prisma.savingsGoal.create({
      data: {
        householdId: user.householdId,
        name: dto.name,
        targetCents: dto.targetCents,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        color: dto.color ?? null,
      },
      include: { contributions: { select: CONTRIBUTION_SELECT } },
    });
    return { ...goal, progressPercent: 0 };
  }

  async update(user: AuthUser, id: string, dto: UpdateGoalDto) {
    await this.getOwned(user, id);
    const goal = await this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.targetCents !== undefined && { targetCents: dto.targetCents }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline ? new Date(dto.deadline) : null }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: { contributions: { select: CONTRIBUTION_SELECT, orderBy: { date: 'desc' } } },
    });
    return {
      ...goal,
      progressPercent:
        goal.targetCents > 0
          ? Math.min(100, Math.round((goal.currentCents / goal.targetCents) * 100))
          : 0,
    };
  }

  async remove(user: AuthUser, id: string) {
    await this.getOwned(user, id);
    await this.prisma.savingsGoal.delete({ where: { id } });
    return { success: true };
  }

  async addContribution(user: AuthUser, id: string, dto: AddContributionDto) {
    await this.getOwned(user, id);
    const date = dto.date ? new Date(dto.date) : new Date();
    const contribution = await this.prisma.goalContribution.create({
      data: {
        goalId: id,
        userId: user.id,
        amountCents: dto.amountCents,
        date,
        notes: dto.notes ?? null,
      },
      select: CONTRIBUTION_SELECT,
    });
    await this.prisma.savingsGoal.update({
      where: { id },
      data: { currentCents: { increment: dto.amountCents } },
    });
    return contribution;
  }

  async removeContribution(user: AuthUser, goalId: string, contributionId: string) {
    await this.getOwned(user, goalId);
    const contribution = await this.prisma.goalContribution.findFirst({
      where: { id: contributionId, goalId },
    });
    if (!contribution) {
      throw new NotFoundException('Contribuição não encontrada');
    }
    await this.prisma.$transaction([
      this.prisma.savingsGoal.update({
        where: { id: goalId },
        data: { currentCents: { decrement: contribution.amountCents } },
      }),
      this.prisma.goalContribution.delete({ where: { id: contributionId } }),
    ]);
    return { success: true };
  }

  private async getOwned(user: AuthUser, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, householdId: user.householdId },
    });
    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }
    return goal;
  }
}
