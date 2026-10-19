import type { ImportPlan } from '../services/importer/parseBackup';
import type { RepoDeps } from './repos/deps';
import { SYNC_TABLES } from './sync/tables';

const oneMsLater = (iso: string) => new Date(Date.parse(iso) + 1).toISOString();

/**
 * Grava a importação SUBSTITUINDO tudo o que existe: o que há vira exclusão lógica (e sobe na
 * sincronização, para os outros aparelhos também limparem) e os dados do backup entram em seguida.
 * Tudo numa transação: se algo falhar, nada muda.
 */
export async function applyImport({ db, now }: RepoDeps, plan: ImportPlan): Promise<void> {
  await db.transaction(async () => {
    const tombstone = now();
    const t = oneMsLater(tombstone); // os novos são sempre mais recentes que os apagados

    for (const spec of SYNC_TABLES) {
      await db.run(`UPDATE ${spec.name} SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE deleted_at IS NULL`, [
        tombstone,
        tombstone,
      ]);
    }

    for (const g of plan.groups) {
      await db.run(
        'INSERT INTO groups (id, name, color, sort_order, is_pix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [g.id, g.name, g.color, g.sortOrder, g.isPix ? 1 : 0, t, t],
      );
    }
    for (const c of plan.categories) {
      await db.run('INSERT INTO categories (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
        c.id, c.name, c.color, t, t,
      ]);
    }
    for (const e of plan.entries) {
      await db.run(
        `INSERT INTO entries (id, group_id, category_id, description, amount_cents, month, occurred_on, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.groupId, e.categoryId, e.description, e.amountCents, e.month, e.occurredOn, t, t],
      );
    }
    for (const r of plan.recurrences) {
      await db.run(
        `INSERT INTO recurrences (id, group_id, category_id, description, kind, amount_cents, total_cents, start_month,
           end_month, installments, first_installment, due_day, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id, r.groupId, r.categoryId ?? null, r.description, r.kind, r.amountCents, r.totalCents, r.startMonth,
          r.endMonth ?? null, r.installments, r.firstInstallment, r.dueDay ?? null, t, t,
        ],
      );
    }
    // Exceções e renda têm chave natural: reaproveitam (e "ressuscitam") a linha apagada, se houver.
    for (const o of plan.overrides) {
      await db.run(
        `INSERT INTO recurrence_overrides (recurrence_id, month, amount_cents, skipped, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, NULL)
         ON CONFLICT (recurrence_id, month) DO UPDATE SET
           amount_cents = excluded.amount_cents, skipped = excluded.skipped,
           updated_at = excluded.updated_at, dirty = 1, deleted_at = NULL`,
        [o.recurrenceId, o.month, o.amountCents ?? null, o.skipped ? 1 : 0, t],
      );
    }
    for (const i of plan.income) {
      await db.run(
        `INSERT INTO income (month, amount_cents, updated_at, deleted_at) VALUES (?, ?, ?, NULL)
         ON CONFLICT (month) DO UPDATE SET
           amount_cents = excluded.amount_cents, updated_at = excluded.updated_at, dirty = 1, deleted_at = NULL`,
        [i.month, i.amountCents, t],
      );
    }
    for (const b of plan.bankEntries) {
      await db.run(
        'INSERT INTO bank_entries (id, month, kind, amount_cents, at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [b.id, b.month, b.kind, b.amountCents, b.at, t, t],
      );
    }
  });
}
