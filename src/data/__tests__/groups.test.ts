import { createGroupsRepo } from '../repos/groups';
import { createTestDeps } from './helpers/deps';

describe('groups repo', () => {
  it('começa vazio', async () => {
    const repo = createGroupsRepo(await createTestDeps());
    expect(await repo.list()).toEqual([]);
  });

  it('cria em ordem e lista na ordem', async () => {
    const repo = createGroupsRepo(await createTestDeps());
    await repo.create({ name: 'Nubank', color: '#7c3aed' });
    await repo.create({ name: 'PIX', color: '#00b87a' });
    const list = await repo.list();
    expect(list.map((g) => g.name)).toEqual(['Nubank', 'PIX']);
    expect(list.every((g) => !g.isPix)).toBe(true);
  });

  it('atualiza nome e cor', async () => {
    const repo = createGroupsRepo(await createTestDeps());
    const g = await repo.create({ name: 'A', color: '#111111' });
    await repo.update(g.id, { name: 'B', color: '#222222' });
    expect((await repo.list())[0]).toMatchObject({ name: 'B', color: '#222222' });
  });

  it('só um grupo pode ser o PIX; trocar move a marca', async () => {
    const repo = createGroupsRepo(await createTestDeps());
    const a = await repo.create({ name: 'A', color: '#111111' });
    const b = await repo.create({ name: 'B', color: '#222222' });
    await repo.setPix(a.id);
    await repo.setPix(b.id);
    const list = await repo.list();
    expect(list.find((g) => g.id === a.id)?.isPix).toBe(false);
    expect(list.find((g) => g.id === b.id)?.isPix).toBe(true);
    await repo.setPix(null);
    expect((await repo.list()).some((g) => g.isPix)).toBe(false);
  });

  it('remover é lógico e leva os lançamentos e recorrências do grupo', async () => {
    const deps = await createTestDeps();
    const repo = createGroupsRepo(deps);
    const g = await repo.create({ name: 'A', color: '#111111' });
    await deps.db.run(
      "INSERT INTO entries (id, group_id, description, amount_cents, month, occurred_on, created_at, updated_at) VALUES ('e1', ?, 'x', 100, '2026-10', '2026-10-01', 't', 't')",
      [g.id],
    );
    await repo.remove(g.id);
    expect(await repo.list()).toEqual([]);
    const e = await deps.db.first<{ deleted_at: string | null }>(
      "SELECT deleted_at FROM entries WHERE id = 'e1'",
    );
    expect(e?.deleted_at).not.toBeNull();
  });
});
