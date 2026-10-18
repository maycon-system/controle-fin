import { createRepos } from '../repos';
import { createTestDeps } from './helpers/deps';

const TABLES = [
  'groups', 'categories', 'entries', 'recurrences',
  'recurrence_overrides', 'income', 'bank_entries',
];

async function setup() {
  const deps = await createTestDeps();
  const repos = createRepos(deps);
  const clean = async () => {
    for (const t of TABLES) await deps.db.run(`UPDATE ${t} SET dirty = 0`);
  };
  const dirtyOf = async (t: string) =>
    (await deps.db.all<{ dirty: number }>(`SELECT dirty FROM ${t}`)).map((r) => r.dirty);
  return { deps, repos, clean, dirtyOf };
}

const fixedInput = (groupId: string) => ({
  groupId, categoryId: null, description: 'Tim', kind: 'fixed' as const,
  amountCents: 6499, totalCents: 0, startMonth: '2026-05', endMonth: null,
  installments: 0, firstInstallment: 1, dueDay: 10,
});

describe('gravações locais marcam a linha como pendente (dirty = 1)', () => {
  it('inserir já nasce pendente', async () => {
    const { repos, dirtyOf } = await setup();
    await repos.groups.create({ name: 'A', color: '#111111' });
    await repos.categories.create({ name: 'C', color: '#222222' });
    await repos.entries.create({ groupId: 'g', description: 'x', amountCents: 1, month: '2026-10', occurredOn: '2026-10-01' });
    await repos.recurrences.create(fixedInput('g'));
    await repos.overrides.upsert({ recurrenceId: 'r', month: '2026-10', amountCents: 1, skipped: false });
    await repos.income.set('2026-10', 100);
    await repos.bankEntries.add('2026-10', 100);
    for (const t of TABLES) expect(await dirtyOf(t)).toEqual([1]);
  });

  it('groups.update, setPix e remove', async () => {
    const { repos, clean, dirtyOf } = await setup();
    const g = await repos.groups.create({ name: 'A', color: '#111111' });
    await clean();
    await repos.groups.update(g.id, { name: 'B' });
    expect(await dirtyOf('groups')).toEqual([1]);
    await clean();
    await repos.groups.setPix(g.id);
    expect(await dirtyOf('groups')).toEqual([1]);
    await clean();
    await repos.groups.remove(g.id);
    expect(await dirtyOf('groups')).toEqual([1]);
  });

  it('groups.remove marca também lançamentos e recorrências do grupo', async () => {
    const { repos, clean, dirtyOf } = await setup();
    const g = await repos.groups.create({ name: 'A', color: '#111111' });
    await repos.entries.create({ groupId: g.id, description: 'x', amountCents: 1, month: '2026-10', occurredOn: '2026-10-01' });
    await repos.recurrences.create(fixedInput(g.id));
    await clean();
    await repos.groups.remove(g.id);
    expect(await dirtyOf('entries')).toEqual([1]);
    expect(await dirtyOf('recurrences')).toEqual([1]);
  });

  it('categories.update e remove (inclui itens que a usavam)', async () => {
    const { repos, clean, dirtyOf } = await setup();
    const c = await repos.categories.create({ name: 'C', color: '#222222' });
    await repos.entries.create({ groupId: 'g', categoryId: c.id, description: 'x', amountCents: 1, month: '2026-10', occurredOn: '2026-10-01' });
    await repos.recurrences.create({ ...fixedInput('g'), categoryId: c.id });
    await clean();
    await repos.categories.update(c.id, { name: 'D' });
    expect(await dirtyOf('categories')).toEqual([1]);
    await clean();
    await repos.categories.remove(c.id);
    expect(await dirtyOf('categories')).toEqual([1]);
    expect(await dirtyOf('entries')).toEqual([1]);
    expect(await dirtyOf('recurrences')).toEqual([1]);
  });

  it('entries.update e remove', async () => {
    const { repos, clean, dirtyOf } = await setup();
    const e = await repos.entries.create({ groupId: 'g', description: 'x', amountCents: 1, month: '2026-10', occurredOn: '2026-10-01' });
    await clean();
    await repos.entries.update(e.id, { amountCents: 2 });
    expect(await dirtyOf('entries')).toEqual([1]);
    await clean();
    await repos.entries.remove(e.id);
    expect(await dirtyOf('entries')).toEqual([1]);
  });

  it('recurrences.update, setEndMonth e remove', async () => {
    const { repos, clean, dirtyOf } = await setup();
    const r = await repos.recurrences.create(fixedInput('g'));
    await clean();
    await repos.recurrences.update(r.id, { amountCents: 7000 });
    expect(await dirtyOf('recurrences')).toEqual([1]);
    await clean();
    await repos.recurrences.setEndMonth(r.id, '2026-08');
    expect(await dirtyOf('recurrences')).toEqual([1]);
    await clean();
    await repos.recurrences.remove(r.id);
    expect(await dirtyOf('recurrences')).toEqual([1]);
  });

  it('overrides.upsert (inserir e substituir) e remove', async () => {
    const { repos, clean, dirtyOf } = await setup();
    await repos.overrides.upsert({ recurrenceId: 'r', month: '2026-10', amountCents: 1, skipped: false });
    await clean();
    await repos.overrides.upsert({ recurrenceId: 'r', month: '2026-10', amountCents: 2, skipped: false });
    expect(await dirtyOf('recurrence_overrides')).toEqual([1]);
    await clean();
    await repos.overrides.remove('r', '2026-10');
    expect(await dirtyOf('recurrence_overrides')).toEqual([1]);
  });

  it('income.set (inserir e substituir)', async () => {
    const { repos, clean, dirtyOf } = await setup();
    await repos.income.set('2026-10', 100);
    await clean();
    await repos.income.set('2026-10', 200);
    expect(await dirtyOf('income')).toEqual([1]);
  });
});
