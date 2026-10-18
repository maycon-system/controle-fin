import { buildReport } from '../report';
import { Occurrence } from '../types';

const occ = (groupId: string, categoryId: string | null, amountCents: number): Occurrence => ({
  key: `${groupId}-${categoryId}-${amountCents}`, source: 'entry', sourceId: 'x',
  groupId, categoryId, description: 'x', amountCents, kind: 'variable', overridden: false,
});

describe('buildReport', () => {
  const input = {
    months: ['2026-09', '2026-10'],
    occurrencesByMonth: {
      '2026-09': [occ('nb', 'farm', 10000), occ('pix', null, 2000)],
      '2026-10': [occ('nb', 'farm', 5000), occ('nb', 'merca', 3000)],
    },
    incomeByMonth: { '2026-09': 600000, '2026-10': 600000 },
  };

  it('soma renda, gasto e saldo do período', () => {
    const r = buildReport(input);
    expect(r.incomeCents).toBe(1200000);
    expect(r.spentCents).toBe(20000);
    expect(r.balanceCents).toBe(1180000);
  });

  it('média mensal do gasto', () => {
    expect(buildReport(input).averageSpentCents).toBe(10000);
  });

  it('agrupa por grupo e por categoria, com "none" para sem categoria', () => {
    const r = buildReport(input);
    expect(r.byGroup).toEqual({ nb: 18000, pix: 2000 });
    expect(r.byCategory).toEqual({ farm: 15000, merca: 3000, none: 2000 });
  });

  it('detalha mês a mês, incluindo mês sem ocorrências', () => {
    const r = buildReport({
      months: ['2026-09', '2026-10', '2026-11'],
      occurrencesByMonth: input.occurrencesByMonth,
      incomeByMonth: { ...input.incomeByMonth, '2026-11': 600000 },
    });
    expect(r.perMonth).toEqual([
      { month: '2026-09', incomeCents: 600000, spentCents: 12000, balanceCents: 588000 },
      { month: '2026-10', incomeCents: 600000, spentCents: 8000, balanceCents: 592000 },
      { month: '2026-11', incomeCents: 600000, spentCents: 0, balanceCents: 600000 },
    ]);
  });

  it('lista de meses vazia devolve tudo zerado, sem dividir por zero', () => {
    const r = buildReport({ months: [], occurrencesByMonth: {}, incomeByMonth: {} });
    expect(r).toEqual({
      incomeCents: 0, spentCents: 0, balanceCents: 0, averageSpentCents: 0,
      byGroup: {}, byCategory: {}, perMonth: [],
    });
  });
});
