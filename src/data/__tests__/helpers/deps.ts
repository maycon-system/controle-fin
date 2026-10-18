import { migrate } from '../../migrations';
import type { RepoDeps } from '../../repos/deps';
import { createTestDb } from './testDb';

export async function createTestDeps(): Promise<RepoDeps> {
  const db = createTestDb();
  await migrate(db);
  let ids = 0;
  let tick = 0;
  return {
    db,
    newId: () => `id-${++ids}`,
    // cada chamada avança 1 segundo: ordem determinística
    now: () => new Date(Date.UTC(2026, 9, 18, 10, 0, tick++)).toISOString(),
  };
}
