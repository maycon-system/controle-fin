import type { RepoDeps } from './deps';

export interface Category {
  id: string;
  name: string;
  color: string;
}

interface Row {
  id: string;
  name: string;
  color: string;
}

export function createCategoriesRepo({ db, newId, now }: RepoDeps) {
  return {
    async list(): Promise<Category[]> {
      const rows = await db.all<Row>(
        'SELECT id, name, color FROM categories WHERE deleted_at IS NULL',
      );
      return rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    },

    async create(input: { name: string; color: string }): Promise<Category> {
      const id = newId();
      const t = now();
      await db.run(
        'INSERT INTO categories (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, input.name, input.color, t, t],
      );
      return { id, name: input.name, color: input.color };
    },

    async update(id: string, patch: { name?: string; color?: string }): Promise<void> {
      const cur = await db.first<Row>('SELECT id, name, color FROM categories WHERE id = ?', [id]);
      if (!cur) return;
      await db.run('UPDATE categories SET name = ?, color = ?, updated_at = ? WHERE id = ?', [
        patch.name ?? cur.name,
        patch.color ?? cur.color,
        now(),
        id,
      ]);
    },

    /** Exclusão lógica; os itens que usavam a categoria ficam sem categoria. */
    async remove(id: string): Promise<void> {
      const t = now();
      await db.transaction(async () => {
        await db.run('UPDATE entries SET category_id = NULL, updated_at = ? WHERE category_id = ?', [t, id]);
        await db.run('UPDATE recurrences SET category_id = NULL, updated_at = ? WHERE category_id = ?', [t, id]);
        await db.run('UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ?', [t, t, id]);
      });
    },
  };
}
