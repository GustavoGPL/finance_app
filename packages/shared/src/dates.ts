export function isValidDay(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

/** Converte "YYYY-MM-DD" em Date no fuso local (evita parse UTC que desloca o dia). */
export function parseDateOnly(value: string): Date {
  const [year, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export interface BillingWindow {
  /** Início do período (fechamento do mês anterior). */
  start: Date;
  /** Fim do período (fechamento do mês corrente). */
  end: Date;
  /** Data de vencimento da fatura (dueDay do mês corrente). */
  dueDate: Date;
  /** Rótulo da fatura, ex.: "08/2026". */
  label: string;
}

/**
 * Calcula a janela de fatura de um cartão para um mês (0-indexado).
 * Ex.: fechamento dia 27, vencimento dia 5, mês setembro (8) →
 *   janela de 27/08 00:00:00 até 27/09 23:59:59, vencimento 05/09.
 */
export function getBillingWindow(year: number, month: number, closingDay: number, dueDay: number): BillingWindow {
  const prev = new Date(year, month - 1, 1);
  const startYear = prev.getFullYear();
  const startMonth = prev.getMonth();
  const start = new Date(startYear, startMonth, closingDay, 0, 0, 0, 0);
  const end = new Date(year, month, closingDay, 23, 59, 59, 999);
  // Fatura que fecha no mês M vence no dueDay do mês M+1.
  const dueDate = new Date(year, month + 1, dueDay, 12, 0, 0, 0);
  const label = `${String(month + 1).padStart(2, '0')}/${year}`;
  return { start, end, dueDate, label };
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
