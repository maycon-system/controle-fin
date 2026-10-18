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

export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return toIndex(to) - toIndex(from);
}
