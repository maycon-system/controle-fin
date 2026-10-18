export type YearMonth = string; // 'AAAA-MM', mês de 01 a 12

function toIndex(ym: YearMonth): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const idx = toIndex(ym) + delta;
  const year = Math.floor(idx / 12);
  const month = ((idx % 12) + 12) % 12 + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
export const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Mês de uma data, no fuso local. */
export function monthOf(date: Date): YearMonth {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** "OUT 2026" (curto) ou "Outubro 2026" (completo). */
export function monthLabel(ym: YearMonth, full = false): string {
  const [y, m] = ym.split('-').map(Number);
  return `${(full ? MONTHS_FULL : MONTHS_SHORT)[m - 1]} ${y}`;
}

/** Meses de `from` a `to`, ambos inclusivos; vazio se `to` < `from`. */
export function rangeOfMonths(from: YearMonth, to: YearMonth): YearMonth[] {
  const n = monthsBetween(from, to);
  return n < 0 ? [] : Array.from({ length: n + 1 }, (_, i) => addMonths(from, i));
}

export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return toIndex(to) - toIndex(from);
}
