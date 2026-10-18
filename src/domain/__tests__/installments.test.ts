import { installmentAmount } from '../installments';

describe('installmentAmount', () => {
  it('põe a sobra de centavos na 1ª parcela', () => {
    expect(installmentAmount(100000, 3, 1)).toBe(33334);
    expect(installmentAmount(100000, 3, 2)).toBe(33333);
    expect(installmentAmount(100000, 3, 3)).toBe(33333);
  });

  it('a soma das parcelas é exatamente o total', () => {
    const total = 168000;
    const n = 12;
    const sum = Array.from({ length: n }, (_, i) => installmentAmount(total, n, i + 1))
      .reduce((a, b) => a + b, 0);
    expect(sum).toBe(total);
  });

  it('divisão exata não gera sobra', () => {
    expect(installmentAmount(168000, 12, 1)).toBe(14000);
    expect(installmentAmount(168000, 12, 12)).toBe(14000);
  });
});
