import { summarizeMonth } from '../summary';
import { Occurrence } from '../types';

const occ = (groupId: string, amountCents: number): Occurrence => ({
  key: `${groupId}-${amountCents}`, source: 'entry', sourceId: 'x',
  groupId, categoryId: null, description: 'x', amountCents,
  kind: 'variable', overridden: false,
});

describe('summarizeMonth', () => {
  const occurrences = [occ('nb', 100000), occ('pix', 30000), occ('fixo', 20000)];

  it('totais por grupo e gasto total', () => {
    const s = summarizeMonth({ occurrences, incomeCents: 600000, bankCents: 200000, pixGroupId: 'pix' });
    expect(s.byGroup).toEqual({ nb: 100000, pix: 30000, fixo: 20000 });
    expect(s.spentCents).toBe(150000);
  });

  it('saldo disponível e percentual da renda', () => {
    const s = summarizeMonth({ occurrences, incomeCents: 600000, bankCents: 200000, pixGroupId: 'pix' });
    expect(s.balanceCents).toBe(450000);
    expect(s.balancePct).toBe(75);
  });

  it('saldo bancário abate só o total do grupo PIX', () => {
    const s = summarizeMonth({ occurrences, incomeCents: 600000, bankCents: 200000, pixGroupId: 'pix' });
    expect(s.bankAvailableCents).toBe(170000);
  });

  it('sem grupo PIX, o banco não é abatido', () => {
    const s = summarizeMonth({ occurrences, incomeCents: 600000, bankCents: 200000, pixGroupId: null });
    expect(s.bankAvailableCents).toBe(200000);
  });

  it('renda zero não divide por zero', () => {
    const s = summarizeMonth({ occurrences, incomeCents: 0, bankCents: 0, pixGroupId: null });
    expect(s.balancePct).toBe(0);
  });
});
