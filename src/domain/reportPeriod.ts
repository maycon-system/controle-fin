import { MONTHS_FULL, rangeOfMonths, type YearMonth } from './month';

export type ReportKind = 'mensal' | 'periodo' | 'anual';

/** Meses de 0 (janeiro) a 11 (dezembro). */
export interface PeriodInput {
  kind: ReportKind;
  year: number;
  monthFrom: number;
  monthTo: number;
}

export interface Period {
  months: YearMonth[];
  title: string;
  subtitle: string;
  /** Rótulo do período (grande, no cabeçalho do PDF). */
  label: string;
}

export type PeriodResult = { ok: true; period: Period } | { ok: false; error: string };

const ym = (year: number, m0: number): YearMonth => `${year}-${String(m0 + 1).padStart(2, '0')}`;

export function buildPeriod({ kind, year, monthFrom, monthTo }: PeriodInput): PeriodResult {
  if (kind === 'mensal') {
    const label = `${MONTHS_FULL[monthFrom]} ${year}`;
    return {
      ok: true,
      period: { months: [ym(year, monthFrom)], title: `Relatório — ${label}`, subtitle: 'Mês completo', label },
    };
  }
  if (kind === 'periodo') {
    if (monthTo < monthFrom) return { ok: false, error: 'O mês final não pode ser antes do mês inicial.' };
    const months = rangeOfMonths(ym(year, monthFrom), ym(year, monthTo));
    const label = `${MONTHS_FULL[monthFrom]} a ${MONTHS_FULL[monthTo]} ${year}`;
    return {
      ok: true,
      period: {
        months,
        title: `Relatório — ${label}`,
        subtitle: `${months.length} ${months.length === 1 ? 'mês' : 'meses'}`,
        label,
      },
    };
  }
  return {
    ok: true,
    period: {
      months: rangeOfMonths(ym(year, 0), ym(year, 11)),
      title: `Relatório anual ${year}`,
      subtitle: 'Janeiro a Dezembro',
      label: `Ano de ${year}`,
    },
  };
}
