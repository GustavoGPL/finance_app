import { type MemberRole, type Visibility } from '@finance/shared';

export interface Theme {
  key: 'dragonball' | 'onepiece' | 'crossover';
  name: string;
  /** Tripla HSL usada em --primary (ex.: "24.6 95% 53.1%"). */
  primary: string;
  primaryForeground: string;
  ring: string;
  /** Gradiente de fallback quando a imagem não está presente. */
  gradient: string;
  /** Caminho da imagem em /public. */
  image: string;
}

export const THEMES: Record<Theme['key'], Theme> = {
  dragonball: {
    key: 'dragonball',
    name: 'Dragon Ball',
    primary: '24.6 95% 53.1%',
    primaryForeground: '0 0% 100%',
    ring: '24.6 95% 53.1%',
    gradient:
      'radial-gradient(1200px 600px at 50% -10%, rgba(249,115,22,0.55) 0%, transparent 60%), linear-gradient(160deg, #0b1020 0%, #1e1b4b 100%)',
    image: '/themes/dragonball.webp',
  },
  onepiece: {
    key: 'onepiece',
    name: 'One Piece',
    primary: '0 72.2% 50.6%',
    primaryForeground: '0 0% 100%',
    ring: '0 72.2% 50.6%',
    gradient: 'linear-gradient(180deg, #0ea5e9 0%, #0369a1 45%, #061c2e 100%)',
    image: '/themes/onepiece.jpg',
  },
  crossover: {
    key: 'crossover',
    name: 'Visão Geral',
    primary: '330.4 81.2% 60.4%',
    primaryForeground: '0 0% 100%',
    ring: '330.4 81.2% 60.4%',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #0ea5e9 100%)',
    image: '/themes/crossover.png',
  },
};

/**
 * Tema conforme o filtro de visibilidade:
 * - SELF   → tema do próprio usuário (USER_A = Dragon Ball, USER_B = One Piece)
 * - COUPLE → tema compartilhado (crossover)
 */
export function themeForVisibility(memberRole: MemberRole, visibility: Visibility): Theme {
  if (visibility === 'COUPLE') {
    return THEMES.crossover;
  }
  return memberRole === 'USER_A' ? THEMES.dragonball : THEMES.onepiece;
}
