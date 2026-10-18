import type { YearMonth } from '../../domain/month';
import type { Override } from '../../domain/types';
import type { RepoDeps } from './deps';

interface Row {
  recurrence_id: string;
  month: string;
  amount_cents: number | null;
  skipped: number;
}

const toOverride = (r: Row): Override => ({
  recurrenceId: r.recurrence_id,
  month: r.month,
  amountCents: r.amount_cents,
  skipped: r.skipped === 1,
});

export function createOverridesRepo({ db, now }: RepoDeps) {
  return {
    /** Cria ou substitui a exceção do mês (reativa se estava excluída). */
    async upsert(o: {
      recurrenceId: string;
      month: YearMonth;
      amountCents?: number | null;
      skipped: boolean;
    }): Promise<void> {
      await db.run(
        `INSERT INTO recurrence_overrides (recurrence_id, month, amount_cents, skipped, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, NULL)
         ON CONFLICT (recurrence_id, month) DO UPDATE SET
           amount_cents = excluded.amount_cents,
           skipped = excluded.skipped,
           updated_at = excluded.updated_at,
           dirty = 1,
           deleted_at = NULL`,
        [o.recurrenceId, o.month, o.amountCents ?? null, o.skipped ? 1 : 0, now()],
      );
    },

    async remove(recurrenceId: string, month: YearMonth): Promise<void> {
      const t = now();
      await db.run(
        'UPDATE recurrence_overrides SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE recurrence_id = ? AND month = ?',
        [t, t, recurrenceId, month],
      );
    },

    async list(): Promise<Override[]> {
      const rows = await db.all<Row>(
        'SELECT recurrence_id, month, amount_cents, skipped FROM recurrence_overrides WHERE deleted_at IS NULL ORDER BY recurrence_id, month',
      );
      return rows.map(toOverride);
    },
  };
}
