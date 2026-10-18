import { parseMoney } from '../money';

describe('parseMoney', () => {
  it('lê vírgula decimal', () => {
    expect(parseMoney('120,00')).toBe(12000);
    expect(parseMoney('0,1')).toBe(10);
    expect(parseMoney('64,99')).toBe(6499);
  });

  it('lê separador de milhar com vírgula decimal', () => {
    expect(parseMoney('1.234,56')).toBe(123456);
    expect(parseMoney('1.680,00')).toBe(168000);
  });

  it('lê ponto decimal quando não há vírgula', () => {
    expect(parseMoney('120.5')).toBe(12050);
    expect(parseMoney('120')).toBe(12000);
  });

  it('ignora R$ e espaços', () => {
    expect(parseMoney('R$ 64,99')).toBe(6499);
    expect(parseMoney('  45 ')).toBe(4500);
  });

  it('devolve null para vazio, texto ou negativo', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('-5')).toBeNull();
    expect(parseMoney('1,2,3')).toBeNull();
  });
});
