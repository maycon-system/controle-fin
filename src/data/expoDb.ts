import type { SQLiteDatabase } from 'expo-sqlite';

import type { Db, SqlParam } from './db';

export function wrapExpoDb(raw: SQLiteDatabase): Db {
  return {
    exec: (sql) => raw.execAsync(sql),
    run: async (sql, params: SqlParam[] = []) => {
      await raw.runAsync(sql, params);
    },
    all: <T>(sql: string, params: SqlParam[] = []) => raw.getAllAsync<T>(sql, params),
    first: <T>(sql: string, params: SqlParam[] = []) => raw.getFirstAsync<T>(sql, params),
    transaction: async <T>(fn: () => Promise<T>) => {
      let out!: T;
      await raw.withTransactionAsync(async () => {
        out = await fn();
      });
      return out;
    },
  };
}
