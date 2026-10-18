import { addMonths, monthsBetween, YearMonth } from '../domain/month';
import { computeOccurrences } from '../domain/occurrences';
import { summarizeMonth } from '../domain/summary';
import type { Repos } from './repos';

/** Tudo que as telas precisam para exibir um mês. */
export async function loadMonth(repos: Repos, month: YearMonth) {
  const [groups, categories, entries, recurrences, overrides, incomeCents, bankCents] =
    await Promise.all([
      repos.groups.list(),
      repos.categories.list(),
      repos.entries.listByMonth(month),
      repos.recurrences.list(),
      repos.overrides.list(),
      repos.income.forMonth(month),
      repos.bankEntries.balance(month),
    ]);
  const occurrences = computeOccurrences(month, entries, recurrences, overrides);
  const pixGroupId = groups.find((g) => g.isPix)?.id ?? null;
  const summary = summarizeMonth({ occurrences, incomeCents, bankCents, pixGroupId });
  return { groups, categories, occurrences, incomeCents, bankCents, summary };
}

export type MonthData = Awaited<ReturnType<typeof loadMonth>>;

/** "Só esta parcela/mês": ajusta o valor de um único mês. */
export function adjustOnlyThisMonth(
  repos: Repos,
  recurrenceId: string,
  month: YearMonth,
  amountCents: number,
) {
  return repos.overrides.upsert({ recurrenceId, month, amountCents, skipped: false });
}

/** "Pular este mês" numa recorrência. */
export function skipThisMonth(repos: Repos, recurrenceId: string, month: YearMonth) {
  return repos.overrides.upsert({ recurrenceId, month, amountCents: null, skipped: true });
}

/** Excluir uma recorrência a partir deste mês, preservando o passado. */
export async function endRecurrenceFrom(repos: Repos, recurrenceId: string, month: YearMonth) {
  const r = await repos.recurrences.get(recurrenceId);
  if (!r) return;
  if (monthsBetween(r.startMonth, month) <= 0) {
    await repos.recurrences.remove(recurrenceId);
  } else {
    await repos.recurrences.setEndMonth(recurrenceId, addMonths(month, -1));
  }
}
