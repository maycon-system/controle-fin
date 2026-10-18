import { Cents } from './money';
import { Occurrence } from './types';

export interface MonthSummary {
  byGroup: Record<string, Cents>;
  spentCents: Cents;
  balanceCents: Cents;
  balancePct: number;
  bankAvailableCents: Cents;
}

export function summarizeMonth(input: {
  occurrences: Occurrence[];
  incomeCents: Cents;
  bankCents: Cents;
  pixGroupId: string | null;
}): MonthSummary {
  const byGroup: Record<string, Cents> = {};
  let spent = 0;
  for (const o of input.occurrences) {
    byGroup[o.groupId] = (byGroup[o.groupId] ?? 0) + o.amountCents;
    spent += o.amountCents;
  }
  const balance = input.incomeCents - spent;
  const pct = input.incomeCents > 0 ? Math.round((balance / input.incomeCents) * 100) : 0;
  const pix = input.pixGroupId ? byGroup[input.pixGroupId] ?? 0 : 0;
  return {
    byGroup,
    spentCents: spent,
    balanceCents: balance,
    balancePct: pct,
    bankAvailableCents: input.bankCents - pix,
  };
}
