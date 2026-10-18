import type { Cents } from '../../domain/money';
import type { YearMonth } from '../../domain/month';
import type { RepoDeps } from './deps';

export function createIncomeRepo({ db, now }: RepoDeps) {
  return {
    async set(month: YearMonth, amountCents: Cents): Promise<void> {
      await db.run(
        `INSERT INTO income (month, amount_cents, updated_at, deleted_at) VALUES (?, ?, ?, NULL)
         ON CONFLICT (month) DO UPDATE SET
           amount_cents = excluded.amount_cents, updated_at = excluded.updated_at,
           dirty = 1, deleted_at = NULL`,
        [month, amountCents, now()],
      );
    },

    /** Renda do mês: o valor definido no mês mais recente <= `month`; 0 se não houver. */
    async forMonth(month: YearMonth): Promise<Cents> {
      const row = await db.first<{ amount_cents: number }>(
        'SELECT amount_cents FROM income WHERE month <= ? AND deleted_at IS NULL ORDER BY month DESC LIMIT 1',
        [month],
      );
      return row?.amount_cents ?? 0;
    },
  };
}
