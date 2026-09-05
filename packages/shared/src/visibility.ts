import { OWNER_TYPES } from './enums';
import type { MemberRole, OwnerType, Visibility } from './enums';

export function partnerRoleOf(role: MemberRole): MemberRole {
  return role === 'USER_A' ? 'USER_B' : 'USER_A';
}

/**
 * Retorna os `ownerType` permitidos para um usuário dado o filtro global.
 * - SELF    → apenas o que é do próprio usuário + SHARED
 * - PARTNER → apenas o que é do cônjuge + SHARED
 * - ALL     → tudo (visão geral do casal)
 */
export function ownerTypesForVisibility(role: MemberRole, visibility: Visibility): OwnerType[] {
  switch (visibility) {
    case 'ALL':
      return [...OWNER_TYPES];
    case 'PARTNER':
      return [partnerRoleOf(role), 'SHARED'];
    case 'SELF':
    default:
      return [role, 'SHARED'];
  }
}
