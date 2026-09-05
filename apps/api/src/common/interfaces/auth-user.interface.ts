import type { MemberRole } from '@finance/shared';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  memberRole: MemberRole;
  householdId: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  memberRole: MemberRole;
  householdId: string;
}
