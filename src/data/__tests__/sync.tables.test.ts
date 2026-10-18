import { SYNC_TABLES } from '../sync/tables';
import { createTestDeps } from './helpers/deps';

describe('SYNC_TABLES', () => {
  it('as colunas sincronizadas batem com o esquema local (só dirty fica de fora)', async () => {
    const { db } = await createTestDeps();
    for (const spec of SYNC_TABLES) {
      const info = await db.all<{ name: string }>(`PRAGMA table_info(${spec.name})`);
      const local = info.map((c) => c.name).sort();
      expect([...spec.columns, 'dirty'].sort()).toEqual(local);
      for (const k of spec.key) expect(spec.columns).toContain(k);
    }
  });

  it('cobre as 7 tabelas de dados', () => {
    expect(SYNC_TABLES.map((t) => t.name).sort()).toEqual([
      'bank_entries',
      'categories',
      'entries',
      'groups',
      'income',
      'recurrence_overrides',
      'recurrences',
    ]);
  });
});
