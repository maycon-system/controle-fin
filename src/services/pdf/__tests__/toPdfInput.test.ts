import type { ReportData } from '../../../data/reports';
import type { Period } from '../../../domain/reportPeriod';
import { toPdfInput } from '../toPdfInput';

const period: Period = {
  months: ['2026-10', '2026-11'],
  title: 'Relatório — Outubro a Novembro 2026',
  subtitle: '2 meses',
  label: 'Outubro a Novembro 2026',
};

const data: ReportData = {
  groups: [
    { id: 'g1', name: 'Nubank', color: '#7c3aed', sortOrder: 0, isPix: false },
    { id: 'g2', name: 'PIX', color: '#00b87a', sortOrder: 1, isPix: true },
    { id: 'g3', name: 'Fixo', color: '#d97706', sortOrder: 2, isPix: false },
  ],
  categories: [
    { id: 'c1', name: 'Farmácia', color: '#dc2626' },
    { id: 'c2', name: 'Mercado', color: '#00b87a' },
    { id: 'c3', name: 'Lazer', color: '#0891b2' },
  ],
  report: {
    incomeCents: 1200000,
    spentCents: 45000,
    balanceCents: 1155000,
    averageSpentCents: 22500,
    byGroup: { g1: 30000, g2: 15000 },
    byCategory: { c1: 5000, c2: 20000, none: 20000 },
    perMonth: [
      { month: '2026-10', incomeCents: 600000, spentCents: 30000, balanceCents: 570000 },
      { month: '2026-11', incomeCents: 600000, spentCents: 15000, balanceCents: 585000 },
    ],
  },
};

describe('toPdfInput', () => {
  it('copia título, subtítulo, período e totais', () => {
    const out = toPdfInput(period, data);
    expect(out).toMatchObject({
      title: 'Relatório — Outubro a Novembro 2026',
      subtitle: '2 meses',
      period: 'Outubro a Novembro 2026',
      incomeCents: 1200000,
      spentCents: 45000,
      balanceCents: 1155000,
      averageCents: 22500,
    });
  });

  it('grupos na ordem do cadastro, inclusive os sem gasto', () => {
    expect(toPdfInput(period, data).groups).toEqual([
      { name: 'Nubank', cents: 30000, color: '#7c3aed' },
      { name: 'PIX', cents: 15000, color: '#00b87a' },
      { name: 'Fixo', cents: 0, color: '#d97706' },
    ]);
  });

  it('categorias: só as com valor, da maior para a menor; "sem categoria" fica de fora', () => {
    expect(toPdfInput(period, data).categories).toEqual([
      { name: 'Mercado', cents: 20000, color: '#00b87a' },
      { name: 'Farmácia', cents: 5000, color: '#dc2626' },
    ]);
  });

  it('meses com rótulo completo e nome do mês', () => {
    expect(toPdfInput(period, data).months).toEqual([
      { label: 'Outubro 2026', monthName: 'Outubro', incomeCents: 600000, spentCents: 30000, balanceCents: 570000 },
      { label: 'Novembro 2026', monthName: 'Novembro', incomeCents: 600000, spentCents: 15000, balanceCents: 585000 },
    ]);
  });

  it('relatório vazio não quebra', () => {
    const empty: ReportData = {
      groups: [],
      categories: [],
      report: {
        incomeCents: 0, spentCents: 0, balanceCents: 0, averageSpentCents: 0,
        byGroup: {}, byCategory: {}, perMonth: [],
      },
    };
    const out = toPdfInput({ ...period, months: [] }, empty);
    expect(out.groups).toEqual([]);
    expect(out.categories).toEqual([]);
    expect(out.months).toEqual([]);
  });
});
