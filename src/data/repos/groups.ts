import type { RepoDeps } from './deps';

export interface Group {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isPix: boolean;
}

interface Row {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_pix: number;
}

const COLS = 'id, name, color, sort_order, is_pix';

const toGroup = (r: Row): Group => ({
  id: r.id,
  name: r.name,
  color: r.color,
  sortOrder: r.sort_order,
  isPix: r.is_pix === 1,
});

export function createGroupsRepo({ db, newId, now }: RepoDeps) {
  return {
    async list(): Promise<Group[]> {
      const rows = await db.all<Row>(
        `SELECT ${COLS} FROM groups WHERE deleted_at IS NULL ORDER BY sort_order, created_at`,
      );
      return rows.map(toGroup);
    },

    async create(input: { name: string; color: string }): Promise<Group> {
      const id = newId();
      const t = now();
      const next = await db.first<{ n: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM groups WHERE deleted_at IS NULL',
      );
      const sortOrder = next?.n ?? 0;
      await db.run(
        'INSERT INTO groups (id, name, color, sort_order, is_pix, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
        [id, input.name, input.color, sortOrder, t, t],
      );
      return { id, name: input.name, color: input.color, sortOrder, isPix: false };
    },

    async update(id: string, patch: { name?: string; color?: string }): Promise<void> {
      const cur = await db.first<Row>(`SELECT ${COLS} FROM groups WHERE id = ?`, [id]);
      if (!cur) return;
      await db.run('UPDATE groups SET name = ?, color = ?, updated_at = ?, dirty = 1 WHERE id = ?', [
        patch.name ?? cur.name,
        patch.color ?? cur.color,
        now(),
        id,
      ]);
    },

    /** Marca o grupo PIX (só um por vez). `null` remove a marca. */
    async setPix(id: string | null): Promise<void> {
      await db.transaction(async () => {
        await db.run('UPDATE groups SET is_pix = 0, updated_at = ?, dirty = 1 WHERE is_pix = 1', [now()]);
        if (id) {
          await db.run('UPDATE groups SET is_pix = 1, updated_at = ?, dirty = 1 WHERE id = ?', [now(), id]);
        }
      });
    },

    /** Exclusão lógica; leva junto os lançamentos e recorrências do grupo. */
    async remove(id: string): Promise<void> {
      const t = now();
      await db.transaction(async () => {
        await db.run(
          'UPDATE entries SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE group_id = ? AND deleted_at IS NULL',
          [t, t, id],
        );
        await db.run(
          'UPDATE recurrences SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE group_id = ? AND deleted_at IS NULL',
          [t, t, id],
        );
        await db.run('UPDATE groups SET deleted_at = ?, is_pix = 0, updated_at = ?, dirty = 1 WHERE id = ?', [
          t,
          t,
          id,
        ]);
      });
    },
  };
}
