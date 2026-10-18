import type { YearMonth } from '../../domain/month';
import type { Entry } from '../../domain/types';
import type { RepoDeps } from './deps';

interface Row {
  id: string;
  group_id: string;
  category_id: string | null;
  description: string;
  amount_cents: number;
  month: string;
}

const COLS = 'id, group_id, category_id, description, amount_cents, month';

const toEntry = (r: Row): Entry => ({
  id: r.id,
  groupId: r.group_id,
  categoryId: r.category_id,
  description: r.description,
  amountCents: r.amount_cents,
  month: r.month,
});

export interface NewEntry {
  groupId: string;
  categoryId?: string | null;
  description: string;
  amountCents: number;
  month: YearMonth;
  occurredOn: string; // AAAA-MM-DD
}

export type EntryPatch = Partial<
  Pick<Entry, 'groupId' | 'categoryId' | 'description' | 'amountCents' | 'month'>
>;

export function createEntriesRepo({ db, newId, now }: RepoDeps) {
  return {
    async create(input: NewEntry): Promise<Entry> {
      const id = newId();
      const t = now();
      await db.run(
        `INSERT INTO entries (id, group_id, category_id, description, amount_cents, month, occurred_on, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.groupId,
          input.categoryId ?? null,
          input.description,
          input.amountCents,
          input.month,
          input.occurredOn,
          t,
          t,
        ],
      );
      return {
        id,
        groupId: input.groupId,
        categoryId: input.categoryId ?? null,
        description: input.description,
        amountCents: input.amountCents,
        month: input.month,
      };
    },

    async update(id: string, patch: EntryPatch): Promise<void> {
      const cur = await db.first<Row>(`SELECT ${COLS} FROM entries WHERE id = ?`, [id]);
      if (!cur) return;
      const next = { ...toEntry(cur), ...patch };
      await db.run(
        `UPDATE entries SET group_id = ?, category_id = ?, description = ?, amount_cents = ?, month = ?, updated_at = ?
         WHERE id = ?`,
        [
          next.groupId,
          next.categoryId ?? null,
          next.description,
          next.amountCents,
          next.month,
          now(),
          id,
        ],
      );
    },

    async remove(id: string): Promise<void> {
      const t = now();
      await db.run('UPDATE entries SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
    },

    async listByMonth(month: YearMonth): Promise<Entry[]> {
      const rows = await db.all<Row>(
        `SELECT ${COLS} FROM entries WHERE month = ? AND deleted_at IS NULL ORDER BY created_at`,
        [month],
      );
      return rows.map(toEntry);
    },

    /** Meses de `from` a `to`, ambos inclusivos. */
    async listBetween(from: YearMonth, to: YearMonth): Promise<Entry[]> {
      const rows = await db.all<Row>(
        `SELECT ${COLS} FROM entries WHERE month >= ? AND month <= ? AND deleted_at IS NULL ORDER BY month, created_at`,
        [from, to],
      );
      return rows.map(toEntry);
    },
  };
}
