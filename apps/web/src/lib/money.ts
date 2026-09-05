/** Converte "1.234,56" (ou "1234.56") em centavos. Retorna null se inválido. */
export function parseMoneyInput(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;
  const negative = cleaned.startsWith('-');
  const numeric = cleaned.replace(/-/g, '').replace(/\./g, '').replace(/,/g, '.');
  const n = parseFloat(numeric);
  if (Number.isNaN(n)) return null;
  const cents = Math.round(n * 100);
  return negative ? -cents : cents;
}

/** Formata centavos para um input numérico, ex.: 123456 -> "1234,56". */
export function centsToInput(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2).replace('.', ',');
}

const shortBrl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Formata centavos de forma compacta, ex.: R$ 1,2 mil. */
export function formatShortBRL(cents: number): string {
  return shortBrl.format(cents / 100);
}
