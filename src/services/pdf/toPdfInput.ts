import type { ReportData } from '../../data/reports';
import { MONTHS_FULL, monthLabel } from '../../domain/month';
import type { Period } from '../../domain/reportPeriod';
import type { ReportPdfInput } from './types';

/** Converte o relatório da tela na entrada do gerador de PDF. */
export function toPdfInput(period: Period, data: ReportData): ReportPdfInput {
  const { report, groups, categories } = data;
  return {
    title: period.title,
    subtitle: period.subtitle,
    period: period.label,
    incomeCents: report.incomeCents,
    spentCents: report.spentCents,
    balanceCents: report.balanceCents,
    averageCents: report.averageSpentCents,
    // O gerador filtra e ordena os grupos; aqui vão todos, na ordem do cadastro.
    groups: groups.map((g) => ({ name: g.name, cents: report.byGroup[g.id] ?? 0, color: g.color })),
    // Só categorias com valor, da maior para a menor. "Sem categoria" o gerador calcula sozinho.
    categories: categories
      .map((c) => ({ name: c.name, cents: report.byCategory[c.id] ?? 0, color: c.color }))
      .filter((c) => c.cents > 0)
      .sort((a, b) => b.cents - a.cents),
    months: report.perMonth.map((m) => ({
      label: monthLabel(m.month, true),
      monthName: MONTHS_FULL[Number(m.month.slice(5, 7)) - 1],
      incomeCents: m.incomeCents,
      spentCents: m.spentCents,
      balanceCents: m.balanceCents,
    })),
  };
}
