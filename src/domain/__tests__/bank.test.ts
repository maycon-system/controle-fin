import { bankBalance } from '../bank';

describe('bankBalance', () => {
  it('sem entradas, o saldo é zero', () => {
    expect(bankBalance([])).toBe(0);
  });

  it('adições somam', () => {
    expect(
      bankBalance([
        { kind: 'add', amountCents: 100000, at: '2026-10-01T10:00:00Z' },
        { kind: 'add', amountCents: 90000, at: '2026-10-16T10:00:00Z' },
      ]),
    ).toBe(190000);
  });

  it('definição redefine o saldo e as adições seguintes somam', () => {
    expect(
      bankBalance([
        { kind: 'add', amountCents: 50000, at: '2026-10-01T10:00:00Z' },
        { kind: 'set', amountCents: 100000, at: '2026-10-02T10:00:00Z' },
        { kind: 'add', amountCents: 90000, at: '2026-10-16T10:00:00Z' },
      ]),
    ).toBe(190000);
  });

  it('respeita a ordem por data, não a ordem do array', () => {
    expect(
      bankBalance([
        { kind: 'add', amountCents: 90000, at: '2026-10-16T10:00:00Z' },
        { kind: 'set', amountCents: 100000, at: '2026-10-02T10:00:00Z' },
      ]),
    ).toBe(190000);
  });
});
