import type { YearMonth } from '../domain/month';
import { computeOccurrences } from '../domain/occurrences';
import { buildReport, type Report } from '../domain/report';
import type { Repos } from './repos';
import type { Category } from './repos/categories';
import type { Group } from './repos/groups';

export interface ReportData {
  report: Report;
  groups: Group[];
  categories: Category[];
}

/** Monta o relatório de um período (meses consecutivos, em ordem crescente). */
export async function loadReport(repos: Repos, months: YearMonth[]): Promise<ReportData> {
  const [groups, categories, recurrences, overrides] = await Promise.all([
    repos.groups.list(),
    repos.categories.list(),
    repos.recurrences.list(),
    repos.overrides.list(),
  ]);
  const entries =
    months.length > 0 ? await repos.entries.listBetween(months[0], months[months.length - 1]) : [];

  const occurrencesByMonth: Record<YearMonth, ReturnType<typeof computeOccurrences>> = {};
  const incomeByMonth: Record<YearMonth, number> = {};
  for (const m of months) {
    occurrencesByMonth[m] = computeOccurrences(m, entries, recurrences, overrides);
    incomeByMonth[m] = await repos.income.forMonth(m);
  }
  return {
    report: buildReport({ months, occurrencesByMonth, incomeByMonth }),
    groups,
    categories,
  };
}
