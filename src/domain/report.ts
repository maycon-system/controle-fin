import { Cents } from './money';
import { YearMonth } from './month';
import { Occurrence } from './types';

export interface ReportInput {
  months: YearMonth[];
  occurrencesByMonth: Record<YearMonth, Occurrence[]>;
  incomeByMonth: Record<YearMonth, Cents>;
}

export interface MonthLine {
  month: YearMonth;
  incomeCents: Cents;
  spentCents: Cents;
  balanceCents: Cents;
}

export interface Report {
  incomeCents: Cents;
  spentCents: Cents;
  balanceCents: Cents;
  averageSpentCents: Cents;
  byGroup: Record<string, Cents>;
  byCategory: Record<string, Cents>; // 'none' = sem categoria
  perMonth: MonthLine[];
}

export function buildReport({ months, occurrencesByMonth, incomeByMonth }: ReportInput): Report {
  const byGroup: Record<string, Cents> = {};
  const byCategory: Record<string, Cents> = {};
  const perMonth: MonthLine[] = [];
  let income = 0;
  let spent = 0;

  for (const month of months) {
    const monthIncome = incomeByMonth[month] ?? 0;
    let monthSpent = 0;
    for (const o of occurrencesByMonth[month] ?? []) {
      monthSpent += o.amountCents;
      byGroup[o.groupId] = (byGroup[o.groupId] ?? 0) + o.amountCents;
      const key = o.categoryId ?? 'none';
      byCategory[key] = (byCategory[key] ?? 0) + o.amountCents;
    }
    perMonth.push({
      month,
      incomeCents: monthIncome,
      spentCents: monthSpent,
      balanceCents: monthIncome - monthSpent,
    });
    income += monthIncome;
    spent += monthSpent;
  }

  return {
    incomeCents: income,
    spentCents: spent,
    balanceCents: income - spent,
    averageSpentCents: months.length > 0 ? Math.round(spent / months.length) : 0,
    byGroup,
    byCategory,
    perMonth,
  };
}
