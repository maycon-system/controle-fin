import { migrate } from '../../migrations';
import type { RepoDeps } from '../../repos/deps';
import { createTestDb } from './testDb';

interface Options {
  /** Prefixo dos ids, para vários "aparelhos" não colidirem. */
  prefix?: string;
  /** Instante inicial do relógio do aparelho (ms desde 1970). */
  base?: number;
}

export async function createTestDeps(opts: Options = {}): Promise<RepoDeps> {
  const db = createTestDb();
  await migrate(db);
  const prefix = opts.prefix ?? 'id';
  const base = opts.base ?? Date.UTC(2026, 9, 18, 10, 0, 0);
  let ids = 0;
  let tick = 0;
  return {
    db,
    newId: () => `${prefix}-${++ids}`,
    // cada chamada avança 1 segundo: ordem determinística
    now: () => new Date(base + 1000 * tick++).toISOString(),
  };
}
