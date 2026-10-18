export interface TableSpec {
  name: string;
  key: string[]; // chave primária (igual no SQLite e no servidor, sem user_id)
  columns: string[]; // colunas sincronizadas, incluindo a chave; sem user_id, server_seq, dirty
  bools: string[]; // 0/1 no SQLite, boolean no servidor
  times: string[]; // texto ISO no SQLite, timestamptz no servidor
}

const T = ['created_at', 'updated_at', 'deleted_at'];

export const SYNC_TABLES: TableSpec[] = [
  {
    name: 'groups', key: ['id'], bools: ['is_pix'], times: T,
    columns: ['id', 'name', 'color', 'sort_order', 'is_pix', ...T],
  },
  {
    name: 'categories', key: ['id'], bools: [], times: T,
    columns: ['id', 'name', 'color', ...T],
  },
  {
    name: 'entries', key: ['id'], bools: [], times: T,
    columns: ['id', 'group_id', 'category_id', 'description', 'amount_cents', 'month', 'occurred_on', ...T],
  },
  {
    name: 'recurrences', key: ['id'], bools: [], times: T,
    columns: [
      'id', 'group_id', 'category_id', 'description', 'kind', 'amount_cents', 'total_cents',
      'start_month', 'end_month', 'installments', 'first_installment', 'due_day', ...T,
    ],
  },
  {
    name: 'recurrence_overrides', key: ['recurrence_id', 'month'], bools: ['skipped'],
    times: ['updated_at', 'deleted_at'],
    columns: ['recurrence_id', 'month', 'amount_cents', 'skipped', 'updated_at', 'deleted_at'],
  },
  {
    name: 'income', key: ['month'], bools: [], times: ['updated_at', 'deleted_at'],
    columns: ['month', 'amount_cents', 'updated_at', 'deleted_at'],
  },
  {
    name: 'bank_entries', key: ['id'], bools: [], times: ['at', ...T],
    columns: ['id', 'month', 'kind', 'amount_cents', 'at', ...T],
  },
];
