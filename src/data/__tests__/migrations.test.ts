import { migrate } from '../migrations';
import { createTestDb } from './helpers/testDb';

describe('migrate', () => {
  it('cria as tabelas e marca a versão', async () => {
    const db = createTestDb();
    await migrate(db);
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const names = tables.map((t) => t.name);
    for (const t of [
      'groups',
      'categories',
      'entries',
      'recurrences',
      'recurrence_overrides',
      'income',
      'bank_entries',
    ]) {
      expect(names).toContain(t);
    }
    const v = await db.first<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(1);
  });

  it('é idempotente', async () => {
    const db = createTestDb();
    await migrate(db);
    await migrate(db);
    const v = await db.first<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(1);
  });

  it('permite no máximo um grupo PIX ativo', async () => {
    const db = createTestDb();
    await migrate(db);
    const ins = (id: string) =>
      db.run(
        "INSERT INTO groups (id, name, color, sort_order, is_pix, created_at, updated_at) VALUES (?, 'g', '#000', 0, 1, 't', 't')",
        [id],
      );
    await ins('a');
    await expect(ins('b')).rejects.toThrow();
  });
});
