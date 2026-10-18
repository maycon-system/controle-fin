import { createEntriesRepo } from '../repos/entries';
import { createTestDeps } from './helpers/deps';

const base = { groupId: 'g1', description: 'Padaria', amountCents: 2150, occurredOn: '2026-10-05' };

describe('entries repo', () => {
  it('listByMonth devolve só o mês pedido', async () => {
    const repo = createEntriesRepo(await createTestDeps());
    await repo.create({ ...base, month: '2026-10' });
    await repo.create({ ...base, month: '2026-09', amountCents: 700 });
    const out = await repo.listByMonth('2026-10');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ groupId: 'g1', description: 'Padaria', amountCents: 2150, month: '2026-10' });
    expect(out[0].categoryId ?? null).toBeNull();
  });

  it('guarda a categoria', async () => {
    const repo = createEntriesRepo(await createTestDeps());
    await repo.create({ ...base, categoryId: 'c1', month: '2026-10' });
    expect((await repo.listByMonth('2026-10'))[0].categoryId).toBe('c1');
  });

  it('atualiza valor e permite limpar a categoria', async () => {
    const repo = createEntriesRepo(await createTestDeps());
    const e = await repo.create({ ...base, categoryId: 'c1', month: '2026-10' });
    await repo.update(e.id, { amountCents: 3000, categoryId: null });
    const out = (await repo.listByMonth('2026-10'))[0];
    expect(out.amountCents).toBe(3000);
    expect(out.categoryId ?? null).toBeNull();
  });

  it('remover é lógico', async () => {
    const repo = createEntriesRepo(await createTestDeps());
    const e = await repo.create({ ...base, month: '2026-10' });
    await repo.remove(e.id);
    expect(await repo.listByMonth('2026-10')).toEqual([]);
  });

  it('listBetween inclui as bordas', async () => {
    const repo = createEntriesRepo(await createTestDeps());
    for (const m of ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08']) {
      await repo.create({ ...base, month: m });
    }
    const out = await repo.listBetween('2026-05', '2026-07');
    expect(out.map((e) => e.month).sort()).toEqual(['2026-05', '2026-06', '2026-07']);
  });
});
