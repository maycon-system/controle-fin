import { rangeOfMonths, type YearMonth } from '../../domain/month';
import { computeOccurrences } from '../../domain/occurrences';
import type { ImportPlan } from './parseBackup';

/**
 * Gasto de cada mês do que vai ser importado, do primeiro dado até o último mês com renda ou lançamento.
 * Serve de prévia para o usuário conferir com o app antigo antes de confirmar.
 */
export function previewTotals(plan: ImportPlan): { month: YearMonth; spentCents: number }[] {
  const dataMonths = [...plan.income.map((i) => i.month), ...plan.entries.map((e) => e.month)].sort();
  const startMonths = [...dataMonths, ...plan.recurrences.map((r) => r.startMonth)].sort();
  if (dataMonths.length === 0 || startMonths.length === 0) return [];
  const months = rangeOfMonths(startMonths[0], dataMonths[dataMonths.length - 1]);
  return months.map((month) => ({
    month,
    spentCents: computeOccurrences(month, plan.entries, plan.recurrences, plan.overrides).reduce(
      (sum, o) => sum + o.amountCents,
      0,
    ),
  }));
}
