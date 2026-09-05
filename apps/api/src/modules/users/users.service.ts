import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

const MEMBER_SELECT = {
  id: true,
  name: true,
  email: true,
  memberRole: true,
  householdId: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: MEMBER_SELECT,
    });

    const household = await this.prisma.household.findUniqueOrThrow({
      where: { id: user.householdId },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        users: {
          select: MEMBER_SELECT,
        },
      },
    });

    return { user, household };
  }
}

export type MeResult = Awaited<ReturnType<UsersService['me']>>;
export type MeUser = MeResult['user'];
export type MeHousehold = MeResult['household'];
