import { Cents } from './money';

export function installmentAmount(totalCents: Cents, count: number, index: number): Cents {
  const base = Math.floor(totalCents / count);
  const rest = totalCents - base * count;
  return index === 1 ? base + rest : base;
}
