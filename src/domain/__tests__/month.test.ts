import { addMonths, monthLabel, monthOf, monthsBetween, rangeOfMonths } from '../month';

describe('month helpers', () => {
  it('monthOf pega o mês de uma data', () => {
    expect(monthOf(new Date(2026, 9, 18))).toBe('2026-10');
    expect(monthOf(new Date(2027, 0, 1))).toBe('2027-01');
  });

  it('monthLabel abreviado e completo', () => {
    expect(monthLabel('2026-10')).toBe('OUT 2026');
    expect(monthLabel('2027-03', true)).toBe('Março 2027');
  });

  it('rangeOfMonths é inclusivo', () => {
    expect(rangeOfMonths('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(rangeOfMonths('2026-05', '2026-05')).toEqual(['2026-05']);
    expect(rangeOfMonths('2026-06', '2026-05')).toEqual([]);
  });
});

describe('month', () => {
  it('soma meses atravessando o ano', () => {
    expect(addMonths('2026-10', 3)).toBe('2027-01');
    expect(addMonths('2026-01', 12)).toBe('2027-01');
    expect(addMonths('2026-03', -3)).toBe('2025-12');
  });

  it('calcula a distância entre meses', () => {
    expect(monthsBetween('2026-05', '2026-10')).toBe(5);
    expect(monthsBetween('2026-10', '2026-05')).toBe(-5);
    expect(monthsBetween('2026-11', '2027-02')).toBe(3);
  });
});
