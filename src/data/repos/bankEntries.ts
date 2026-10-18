import { bankBalance } from '../../domain/bank';
import type { Cents } from '../../domain/money';
import type { YearMonth } from '../../domain/month';
import type { RepoDeps } from './deps';

export interface BankEntry {
  id: string;
  month: YearMonth;
  kind: 'add' | 'set';
  amountCents: Cents;
  at: string;
}

interface Row {
  id: string;
  month: string;
  kind: 'add' | 'set';
  amount_cents: number;
  at: string;
}

const toBankEntry = (r: Row): BankEntry => ({
  id: r.id,
  month: r.month,
  kind: r.kind,
  amountCents: r.amount_cents,
  at: r.at,
});

export function createBankEntriesRepo({ db, newId, now }: RepoDeps) {
  async function insert(month: YearMonth, kind: 'add' | 'set', amountCents: Cents): Promise<void> {
    const t = now();
    await db.run(
      'INSERT INTO bank_entries (id, month, kind, amount_cents, at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newId(), month, kind, amountCents, t, t, t],
    );
  }

  async function listByMonth(month: YearMonth): Promise<BankEntry[]> {
    const rows = await db.all<Row>(
      'SELECT id, month, kind, amount_cents, at FROM bank_entries WHERE month = ? AND deleted_at IS NULL ORDER BY at',
      [month],
    );
    return rows.map(toBankEntry);
  }

  return {
    add: (month: YearMonth, amountCents: Cents) => insert(month, 'add', amountCents),
    set: (month: YearMonth, amountCents: Cents) => insert(month, 'set', amountCents),
    listByMonth,
    async balance(month: YearMonth): Promise<Cents> {
      return bankBalance(await listByMonth(month));
    },
  };
}
