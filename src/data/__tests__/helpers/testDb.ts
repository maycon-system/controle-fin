import { DatabaseSync } from 'node:sqlite';

import type { Db, SqlParam } from '../../db';

export function createTestDb(): Db {
  const raw = new DatabaseSync(':memory:');
  return {
    exec: async (sql) => {
      raw.exec(sql);
    },
    run: async (sql, params: SqlParam[] = []) => {
      raw.prepare(sql).run(...params);
    },
    all: async <T>(sql: string, params: SqlParam[] = []) =>
      raw.prepare(sql).all(...params) as unknown as T[],
    first: async <T>(sql: string, params: SqlParam[] = []) =>
      (raw.prepare(sql).get(...params) as unknown as T | undefined) ?? null,
    transaction: async (fn) => {
      raw.exec('BEGIN');
      try {
        const out = await fn();
        raw.exec('COMMIT');
        return out;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
