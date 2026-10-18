import {
  adjustOnlyThisMonth,
  endRecurrenceFrom,
  loadMonth,
  skipThisMonth,
} from '../actions';
import { createRepos } from '../repos';
import { createTestDeps } from './helpers/deps';

async function setup() {
  const repos = createRepos(await createTestDeps());
  const nb = await repos.groups.create({ name: 'Nubank', color: '#7c3aed' });
  const pix = await repos.groups.create({ name: 'PIX', color: '#00b87a' });
  await repos.groups.setPix(pix.id);
  await repos.income.set('2026-10', 600000);
  await repos.bankEntries.set('2026-10', 200000);
  return { repos, nb, pix };
}

const fixedBase = (groupId: string) => ({
  groupId, categoryId: null, description: 'Tim', kind: 'fixed' as const,
  amountCents: 6499, totalCents: 0, startMonth: '2026-05', endMonth: null,
  installments: 0, firstInstallment: 1, dueDay: 10,
});

describe('loadMonth', () => {
  it('junta lançamento, fixo e parcelado e calcula o resumo', async () => {
    const { repos, nb, pix } = await setup();
    await repos.entries.create({
      groupId: nb.id, description: 'Farmácia', amountCents: 12000, month: '2026-10', occurredOn: '2026-10-05',
    });
    await repos.entries.create({
      groupId: pix.id, description: 'Padaria', amountCents: 3000, month: '2026-10', occurredOn: '2026-10-06',
    });
    await repos.recurrences.create(fixedBase(nb.id));
    await repos.recurrences.create({
      groupId: nb.id, categoryId: null, description: 'Curso', kind: 'installment',
      amountCents: 0, totalCents: 168000, startMonth: '2026-10', endMonth: null,
      installments: 12, firstInstallment: 1, dueDay: null,
    });

    const m = await loadMonth(repos, '2026-10');
    expect(m.occurrences).toHaveLength(4);
    expect(m.summary.byGroup).toEqual({ [nb.id]: 12000 + 6499 + 14000, [pix.id]: 3000 });
    expect(m.summary.spentCents).toBe(35499);
    expect(m.summary.balanceCents).toBe(600000 - 35499);
    expect(m.summary.bankAvailableCents).toBe(200000 - 3000);
    expect(m.groups).toHaveLength(2);
  });

  it('mês vazio devolve resumo zerado', async () => {
    const { repos } = await setup();
    const m = await loadMonth(repos, '2026-11');
    expect(m.occurrences).toEqual([]);
    expect(m.summary.spentCents).toBe(0);
    expect(m.incomeCents).toBe(600000); // herdada
    expect(m.bankCents).toBe(0); // saldo bancário é por mês
  });
});

describe('endRecurrenceFrom', () => {
  it('preserva os meses anteriores e encerra do mês dado em diante', async () => {
    const { repos, nb } = await setup();
    const r = await repos.recurrences.create(fixedBase(nb.id));
    await endRecurrenceFrom(repos, r.id, '2026-08');
    expect((await loadMonth(repos, '2026-07')).occurrences).toHaveLength(1);
    expect((await loadMonth(repos, '2026-08')).occurrences).toHaveLength(0);
    expect((await loadMonth(repos, '2026-12')).occurrences).toHaveLength(0);
  });

  it('no mês de início, a recorrência some de todos os meses', async () => {
    const { repos, nb } = await setup();
    const r = await repos.recurrences.create(fixedBase(nb.id));
    await endRecurrenceFrom(repos, r.id, '2026-05');
    expect((await loadMonth(repos, '2026-05')).occurrences).toHaveLength(0);
    expect((await loadMonth(repos, '2026-10')).occurrences).toHaveLength(0);
    expect(await repos.recurrences.list()).toEqual([]);
  });
});

describe('exceções por mês', () => {
  it('adjustOnlyThisMonth muda só aquele mês', async () => {
    const { repos, nb } = await setup();
    const r = await repos.recurrences.create(fixedBase(nb.id));
    await adjustOnlyThisMonth(repos, r.id, '2026-06', 7052);
    expect((await loadMonth(repos, '2026-06')).occurrences[0].amountCents).toBe(7052);
    expect((await loadMonth(repos, '2026-07')).occurrences[0].amountCents).toBe(6499);
  });

  it('skipThisMonth remove só aquele mês', async () => {
    const { repos, nb } = await setup();
    const r = await repos.recurrences.create(fixedBase(nb.id));
    await skipThisMonth(repos, r.id, '2026-06');
    expect((await loadMonth(repos, '2026-06')).occurrences).toHaveLength(0);
    expect((await loadMonth(repos, '2026-07')).occurrences).toHaveLength(1);
  });
});
