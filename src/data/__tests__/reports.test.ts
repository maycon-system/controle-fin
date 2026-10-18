import { loadReport } from '../reports';
import { createRepos } from '../repos';
import { createTestDeps } from './helpers/deps';

async function setup() {
  const repos = createRepos(await createTestDeps());
  const nb = await repos.groups.create({ name: 'Nubank', color: '#7c3aed' });
  const pix = await repos.groups.create({ name: 'PIX', color: '#00b87a' });
  const farm = await repos.categories.create({ name: 'Farmácia', color: '#dc2626' });
  return { repos, nb, pix, farm };
}

const entry = (groupId: string, month: string, amountCents: number, categoryId: string | null = null) => ({
  groupId, categoryId, description: 'x', amountCents, month, occurredOn: `${month}-05`,
});

const fixed = (groupId: string) => ({
  groupId, categoryId: null, description: 'Tim', kind: 'fixed' as const, amountCents: 6499,
  totalCents: 0, startMonth: '2026-05', endMonth: null, installments: 0, firstInstallment: 1, dueDay: 10,
});

const installment = (groupId: string) => ({
  groupId, categoryId: null, description: 'Curso', kind: 'installment' as const, amountCents: 0,
  totalCents: 168000, startMonth: '2026-10', endMonth: null, installments: 12, firstInstallment: 1, dueDay: null,
});

describe('loadReport', () => {
  it('soma renda (herdada) e gasto do período', async () => {
    const { repos, nb } = await setup();
    await repos.income.set('2026-09', 600000);
    await repos.entries.create(entry(nb.id, '2026-09', 10000));
    await repos.entries.create(entry(nb.id, '2026-10', 5000));
    const { report } = await loadReport(repos, ['2026-09', '2026-10']);
    expect(report.incomeCents).toBe(1200000); // outubro herda a renda de setembro
    expect(report.spentCents).toBe(15000);
    expect(report.balanceCents).toBe(1185000);
  });

  it('aplica recorrências, parcelas e exceções só no mês certo', async () => {
    const { repos, nb } = await setup();
    const r = await repos.recurrences.create(fixed(nb.id));
    await repos.recurrences.create(installment(nb.id));
    await repos.overrides.upsert({ recurrenceId: r.id, month: '2026-10', amountCents: 7052, skipped: false });
    const { report } = await loadReport(repos, ['2026-10', '2026-11']);
    // out: 7052 (ajustado) + 14000; nov: 6499 + 14000
    expect(report.perMonth.map((m) => m.spentCents)).toEqual([21052, 20499]);
    expect(report.spentCents).toBe(41551);
  });

  it('agrupa por grupo e por categoria, com "none" para sem categoria', async () => {
    const { repos, nb, pix, farm } = await setup();
    await repos.entries.create(entry(nb.id, '2026-10', 12000, farm.id));
    await repos.entries.create(entry(pix.id, '2026-10', 3000));
    const { report, groups, categories } = await loadReport(repos, ['2026-10']);
    expect(report.byGroup).toEqual({ [nb.id]: 12000, [pix.id]: 3000 });
    expect(report.byCategory).toEqual({ [farm.id]: 12000, none: 3000 });
    expect(groups.map((g) => g.name)).toEqual(['Nubank', 'PIX']);
    expect(categories.map((c) => c.name)).toEqual(['Farmácia']);
  });

  it('mês sem nada entra no detalhamento com gasto 0', async () => {
    const { repos, nb } = await setup();
    await repos.entries.create(entry(nb.id, '2026-10', 5000));
    const { report } = await loadReport(repos, ['2026-10', '2026-11']);
    expect(report.perMonth).toEqual([
      { month: '2026-10', incomeCents: 0, spentCents: 5000, balanceCents: -5000 },
      { month: '2026-11', incomeCents: 0, spentCents: 0, balanceCents: 0 },
    ]);
  });

  it('lista de meses vazia devolve tudo zerado', async () => {
    const { repos } = await setup();
    const { report } = await loadReport(repos, []);
    expect(report).toEqual({
      incomeCents: 0, spentCents: 0, balanceCents: 0, averageSpentCents: 0,
      byGroup: {}, byCategory: {}, perMonth: [],
    });
  });

  it('itens excluídos não entram', async () => {
    const { repos, nb } = await setup();
    const e = await repos.entries.create(entry(nb.id, '2026-10', 5000));
    await repos.entries.remove(e.id);
    const r = await repos.recurrences.create(fixed(nb.id));
    await repos.recurrences.remove(r.id);
    const { report } = await loadReport(repos, ['2026-10']);
    expect(report.spentCents).toBe(0);
  });
});
