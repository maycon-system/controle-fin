import type { Db } from '../db';

export interface RepoDeps {
  db: Db;
  newId: () => string;
  now: () => string; // ISO 8601
}
