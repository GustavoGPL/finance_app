import type { MemberRole, OwnerType, Visibility } from './enums';

/**
 * Retorna os `ownerType` permitidos para um usuário dado o filtro de visibilidade.
 * - SELF   → o que é do próprio usuário + SHARED
 * - COUPLE → apenas SHARED (nunca o pessoal de nenhum dos dois)
 *
 * Não existe visão do cônjuge: itens `USER_A`/`USER_B` são sempre privados do dono.
 */
export function ownerTypesForVisibility(role: MemberRole, visibility: Visibility): OwnerType[] {
  switch (visibility) {
    case 'COUPLE':
      return ['SHARED'];
    case 'SELF':
    default:
      return [role, 'SHARED'];
  }
}
