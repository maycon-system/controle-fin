import { MIGRATIONS, migrate } from '../migrations';
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
    expect(v?.user_version).toBe(2);
  });

  it('é idempotente', async () => {
    const db = createTestDb();
    await migrate(db);
    await migrate(db);
    const v = await db.first<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(2);
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

  it('v2: adiciona dirty (padrão 1) e sync_state, sem perder dados da v1', async () => {
    const db = createTestDb();
    await db.exec(MIGRATIONS[0]);
    await db.exec('PRAGMA user_version = 1');
    await db.run(
      "INSERT INTO groups (id, name, color, sort_order, is_pix, created_at, updated_at) VALUES ('g', 'A', '#000', 0, 0, 't', 't')",
    );
    await migrate(db);
    const row = await db.first<{ dirty: number }>("SELECT dirty FROM groups WHERE id = 'g'");
    expect(row?.dirty).toBe(1); // o que já existia precisa subir no primeiro login
    const v = await db.first<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(2);
    await db.run("INSERT INTO sync_state (key, value) VALUES ('k', 'v')");
    const st = await db.first<{ value: string }>("SELECT value FROM sync_state WHERE key = 'k'");
    expect(st?.value).toBe('v');
  });
});
