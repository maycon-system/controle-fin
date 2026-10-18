import { toCents, formatBRL } from '../money';

describe('money', () => {
  it('converte reais em centavos sem erro de ponto flutuante', () => {
    expect(toCents(64.99)).toBe(6499);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it('formata em BRL', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(formatBRL(0)).toBe('R$ 0,00');
    expect(formatBRL(-5000)).toBe('-R$ 50,00');
  });
});
