import { installmentAmount } from './installments';
import { monthsBetween, YearMonth } from './month';
import { Entry, Occurrence, Override, Recurrence } from './types';

export function computeOccurrences(
  month: YearMonth,
  entries: Entry[],
  recurrences: Recurrence[],
  overrides: Override[],
): Occurrence[] {
  const out: Occurrence[] = [];

  for (const e of entries) {
    if (e.month !== month) continue;
    out.push({
      key: `e:${e.id}`, source: 'entry', sourceId: e.id,
      groupId: e.groupId, categoryId: e.categoryId ?? null,
      description: e.description, amountCents: e.amountCents,
      kind: 'variable', overridden: false,
    });
  }

  for (const r of recurrences) {
    const delta = monthsBetween(r.startMonth, month);
    if (delta < 0) continue;
    if (r.endMonth && monthsBetween(r.endMonth, month) > 0) continue;

    let amount = r.amountCents;
    let installment: Occurrence['installment'];
    if (r.kind === 'installment') {
      const current = r.firstInstallment + delta;
      if (current > r.installments) continue;
      amount = installmentAmount(r.totalCents, r.installments, current);
      installment = { current, total: r.installments };
    }

    const ov = overrides.find((o) => o.recurrenceId === r.id && o.month === month);
    if (ov?.skipped) continue;
    const overridden = ov?.amountCents != null;
    if (overridden) amount = ov!.amountCents as number;

    out.push({
      key: `r:${r.id}:${month}`, source: 'recurrence', sourceId: r.id,
      groupId: r.groupId, categoryId: r.categoryId ?? null,
      description: r.description, amountCents: amount,
      kind: r.kind, installment, dueDay: r.dueDay ?? null, overridden,
    });
  }

  return out;
}
