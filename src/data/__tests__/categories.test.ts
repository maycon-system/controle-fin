import { createCategoriesRepo } from '../repos/categories';
import { createTestDeps } from './helpers/deps';

describe('categories repo', () => {
  it('lista ordenada por nome, ignorando acento e caixa', async () => {
    const repo = createCategoriesRepo(await createTestDeps());
    await repo.create({ name: 'Mercado', color: '#00b87a' });
    await repo.create({ name: 'Farmácia', color: '#dc2626' });
    await repo.create({ name: 'educação', color: '#0284c7' });
    expect((await repo.list()).map((c) => c.name)).toEqual(['educação', 'Farmácia', 'Mercado']);
  });

  it('atualiza nome e cor', async () => {
    const repo = createCategoriesRepo(await createTestDeps());
    const c = await repo.create({ name: 'A', color: '#111111' });
    await repo.update(c.id, { name: 'B', color: '#222222' });
    expect((await repo.list())[0]).toMatchObject({ name: 'B', color: '#222222' });
  });

  it('remover desvincula os itens que usavam a categoria', async () => {
    const deps = await createTestDeps();
    const repo = createCategoriesRepo(deps);
    const c = await repo.create({ name: 'A', color: '#111111' });
    await deps.db.run(
      "INSERT INTO entries (id, group_id, category_id, description, amount_cents, month, occurred_on, created_at, updated_at) VALUES ('e1', 'g', ?, 'x', 100, '2026-10', '2026-10-01', 't', 't')",
      [c.id],
    );
    await repo.remove(c.id);
    expect(await repo.list()).toEqual([]);
    const e = await deps.db.first<{ category_id: string | null }>(
      "SELECT category_id FROM entries WHERE id = 'e1'",
    );
    expect(e?.category_id).toBeNull();
  });
});
