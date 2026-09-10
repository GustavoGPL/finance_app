import { parseDateOnly } from '@finance/shared';

/**
 * Formata uma data "date-only" (ex.: "2026-09-09" ou um ISO completo vindo da API)
 * sem conversão de fuso, evitando recuar um dia quando o servidor está em UTC.
 */
export function formatDateOnly(value: string, formatter: Intl.DateTimeFormat): string {
  return formatter.format(parseDateOnly(value.slice(0, 10)));
}
