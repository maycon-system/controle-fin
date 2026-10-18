import { addMonths, monthsBetween } from '../month';

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
