export type Cents = number;

export function toCents(reais: number): Cents {
  return Math.round(Number((reais * 100).toFixed(4)));
}

/**
 * Interpreta o valor digitado pelo usuário ("1.234,56", "120,5", "120.50", "R$ 64,99").
 * Devolve centavos, ou null se vazio, inválido ou negativo.
 */
export function parseMoney(text: string): Cents | null {
  let s = text.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    if (s.split(',').length > 2) return null;
    s = s.replace(/\./g, '').replace(',', '.');
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return toCents(Number(s));
}

export function formatBRL(cents: Cents): string {
  const abs = Math.abs(cents) / 100;
  const text = abs.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (cents < 0 ? '-' : '') + 'R$ ' + text;
}
