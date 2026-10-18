import { Cents } from './money';

export interface BankEntryLike {
  kind: 'add' | 'set';
  amountCents: Cents;
  at: string;
}

export function bankBalance(entries: BankEntryLike[]): Cents {
  const ordered = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  let balance = 0;
  for (const e of ordered) balance = e.kind === 'set' ? e.amountCents : balance + e.amountCents;
  return balance;
}
