const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Converte centavos (inteiros) para reais (float de exibição). */
export function centsToAmount(cents: number): number {
  return cents / 100;
}

/** Converte reais para centavos inteiros, evitando erro de ponto flutuante. */
export function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function formatBRL(cents: number): string {
  return brl.format(centsToAmount(cents));
}

export function formatSignedBRL(cents: number): string {
  const sign = cents < 0 ? '- ' : '+ ';
  return `${sign}${brl.format(centsToAmount(Math.abs(cents)))}`;
}
