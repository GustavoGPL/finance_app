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
export class HouseholdService {
  constructor(private readonly prisma: PrismaService) {}

  getByUser(userId: string) {
    return this.prisma.user
      .findUniqueOrThrow({
        where: { id: userId },
        select: { householdId: true },
      })
      .then(({ householdId }) =>
        this.prisma.household.findUniqueOrThrow({
          where: { id: householdId },
          select: {
            id: true,
            name: true,
            inviteCode: true,
            users: { select: MEMBER_SELECT },
          },
        }),
      );
  }
}
