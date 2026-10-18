import type { Db } from './db';

const V1 = `
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_pix INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE UNIQUE INDEX one_pix_group ON groups(is_pix) WHERE is_pix = 1 AND deleted_at IS NULL;

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  category_id TEXT,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  month TEXT NOT NULL,
  occurred_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_entries_month ON entries(month);

CREATE TABLE recurrences (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  category_id TEXT,
  description TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fixed', 'installment')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  start_month TEXT NOT NULL,
  end_month TEXT,
  installments INTEGER NOT NULL DEFAULT 0,
  first_installment INTEGER NOT NULL DEFAULT 1,
  due_day INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE recurrence_overrides (
  recurrence_id TEXT NOT NULL,
  month TEXT NOT NULL,
  amount_cents INTEGER,
  skipped INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (recurrence_id, month)
);

CREATE TABLE income (
  month TEXT PRIMARY KEY,
  amount_cents INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE bank_entries (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('add', 'set')),
  amount_cents INTEGER NOT NULL,
  at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_bank_month ON bank_entries(month);
`;

export const MIGRATIONS: string[] = [V1];

export async function migrate(db: Db): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]);
      await db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
