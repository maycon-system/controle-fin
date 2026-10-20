import type { YearMonth } from '../../domain/month';
import type { Recurrence } from '../../domain/types';
import type { RepoDeps } from './deps';

interface Row {
  id: string;
  group_id: string;
  category_id: string | null;
  description: string;
  kind: 'fixed' | 'installment';
  amount_cents: number;
  total_cents: number;
  start_month: string;
  end_month: string | null;
  installments: number;
  first_installment: number;
  due_day: number | null;
  created_at?: string;
}

const COLS =
  'id, group_id, category_id, description, kind, amount_cents, total_cents, start_month, end_month, installments, first_installment, due_day';
const SEL = `${COLS}, created_at`;

const pad = (n: number) => String(n).padStart(2, '0');
function localDateOf(iso?: string): string | undefined {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : undefined;
}

const toRecurrence = (r: Row): Recurrence => ({
  id: r.id,
  groupId: r.group_id,
  categoryId: r.category_id,
  description: r.description,
  kind: r.kind,
  amountCents: r.amount_cents,
  totalCents: r.total_cents,
  startMonth: r.start_month,
  endMonth: r.end_month,
  installments: r.installments,
  firstInstallment: r.first_installment,
  dueDay: r.due_day,
  insertedOn: localDateOf(r.created_at),
});

export type NewRecurrence = Omit<Recurrence, 'id'>;
export type RecurrencePatch = Partial<NewRecurrence>;

export function createRecurrencesRepo({ db, newId, now }: RepoDeps) {
  return {
    async create(input: NewRecurrence): Promise<Recurrence> {
      const id = newId();
      const t = now();
      await db.run(
        `INSERT INTO recurrences (${COLS}, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.groupId,
          input.categoryId ?? null,
          input.description,
          input.kind,
          input.amountCents,
          input.totalCents,
          input.startMonth,
          input.endMonth ?? null,
          input.installments,
          input.firstInstallment,
          input.dueDay ?? null,
          t,
          t,
        ],
      );
      return {
        ...input,
        id,
        categoryId: input.categoryId ?? null,
        endMonth: input.endMonth ?? null,
        dueDay: input.dueDay ?? null,
      };
    },

    async get(id: string): Promise<Recurrence | null> {
      const row = await db.first<Row>(
        `SELECT ${SEL} FROM recurrences WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toRecurrence(row) : null;
    },

    async list(): Promise<Recurrence[]> {
      const rows = await db.all<Row>(
        `SELECT ${SEL} FROM recurrences WHERE deleted_at IS NULL ORDER BY created_at`,
      );
      return rows.map(toRecurrence);
    },

    async update(id: string, patch: RecurrencePatch): Promise<void> {
      const cur = await this.get(id);
      if (!cur) return;
      const n = { ...cur, ...patch };
      await db.run(
        `UPDATE recurrences SET group_id = ?, category_id = ?, description = ?, kind = ?, amount_cents = ?,
           total_cents = ?, start_month = ?, end_month = ?, installments = ?, first_installment = ?,
           due_day = ?, updated_at = ?, dirty = 1
         WHERE id = ?`,
        [
          n.groupId,
          n.categoryId ?? null,
          n.description,
          n.kind,
          n.amountCents,
          n.totalCents,
          n.startMonth,
          n.endMonth ?? null,
          n.installments,
          n.firstInstallment,
          n.dueDay ?? null,
          now(),
          id,
        ],
      );
    },

    /** Último mês em que a regra vale (inclusivo). `null` reabre a regra. */
    async setEndMonth(id: string, endMonth: YearMonth | null): Promise<void> {
      await db.run('UPDATE recurrences SET end_month = ?, updated_at = ?, dirty = 1 WHERE id = ?', [
        endMonth,
        now(),
        id,
      ]);
    },

    async remove(id: string): Promise<void> {
      const t = now();
      await db.run('UPDATE recurrences SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?', [t, t, id]);
    },
  };
}
