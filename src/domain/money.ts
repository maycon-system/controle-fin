export type Cents = number;

export function toCents(reais: number): Cents {
  return Math.round(Number((reais * 100).toFixed(4)));
}

export function formatBRL(cents: Cents): string {
  const abs = Math.abs(cents) / 100;
  const text = abs.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (cents < 0 ? '-' : '') + 'R$ ' + text;
}
