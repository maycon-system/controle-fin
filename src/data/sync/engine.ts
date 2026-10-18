import type { Db, SqlParam } from '../db';
import type { Remote, RemoteRow } from './remote';
import { SYNC_TABLES, type TableSpec } from './tables';

export class SyncError extends Error {
  constructor(
    public code: 'ACCOUNT_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export interface SyncOptions {
  /** Conta (auth.uid) dona dos dados. */
  userId: string;
  pageSize?: number;
  pushBatch?: number;
  now?: () => string;
}

export interface SyncResult {
  pushed: number;
  pulled: number; // linhas remotas que mudaram o banco local
  changedLocal: boolean;
}

const OVERLAP = 20; // releitura de uma janela antes do cursor (gravações concorrentes atrasadas)
const DEFAULT_PAGE = 500;
const DEFAULT_BATCH = 200;

type LocalRow = Record<string, SqlParam>;

// ── Estado de sincronização ──────────────────────────────────────────────────
async function getState(db: Db, key: string): Promise<string | null> {
  const row = await db.first<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', [key]);
  return row?.value ?? null;
}

async function setState(db: Db, key: string, value: string): Promise<void> {
  await db.run(
    'INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

// ── Conversão SQLite <-> servidor ────────────────────────────────────────────
function toRemote(spec: TableSpec, row: LocalRow, userId: string): RemoteRow {
  const out: RemoteRow = { user_id: userId };
  for (const c of spec.columns) {
    const v = row[c];
    out[c] = spec.bools.includes(c) ? v === 1 : (v ?? null);
  }
  return out;
}

function fromRemote(spec: TableSpec, r: RemoteRow): LocalRow {
  const out: LocalRow = {};
  for (const c of spec.columns) {
    const v = r[c];
    if (v === null || v === undefined) out[c] = null;
    else if (spec.bools.includes(c)) out[c] = v ? 1 : 0;
    else if (spec.times.includes(c)) out[c] = new Date(v as string).toISOString();
    else out[c] = v as SqlParam;
  }
  return out;
}

const keyWhere = (spec: TableSpec) => spec.key.map((k) => `${k} = ?`).join(' AND ');

// ── Envio ────────────────────────────────────────────────────────────────────
async function push(db: Db, remote: Remote, spec: TableSpec, userId: string, batch: number): Promise<number> {
  const rows = await db.all<LocalRow>(`SELECT ${spec.columns.join(', ')} FROM ${spec.name} WHERE dirty = 1`);
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    await remote.upsert(spec.name, chunk.map((r) => toRemote(spec, r, userId)));
    // Só limpa se a linha não mudou desde o que foi enviado (updated_at igual).
    await db.transaction(async () => {
      for (const r of chunk) {
        await db.run(`UPDATE ${spec.name} SET dirty = 0 WHERE ${keyWhere(spec)} AND updated_at = ?`, [
          ...spec.key.map((k) => r[k]),
          r.updated_at,
        ]);
      }
    });
  }
  return rows.length;
}

// ── Leitura ──────────────────────────────────────────────────────────────────
/** Aplica uma linha remota; última escrita vence. Devolve true se mudou o banco local. */
async function applyRow(db: Db, spec: TableSpec, remoteRow: RemoteRow, now: () => string): Promise<boolean> {
  const r = fromRemote(spec, remoteRow);
  const existing = await db.first<{ updated_at: string }>(
    `SELECT updated_at FROM ${spec.name} WHERE ${keyWhere(spec)}`,
    spec.key.map((k) => r[k]),
  );
  if (existing && existing.updated_at >= (r.updated_at as string)) return false;

  let dirty = 0;
  if (spec.name === 'groups' && r.is_pix === 1 && r.deleted_at === null) {
    // Só pode haver um grupo PIX ativo: fica com a marca o mais recentemente alterado.
    const other = await db.first<{ id: string; updated_at: string }>(
      'SELECT id, updated_at FROM groups WHERE is_pix = 1 AND deleted_at IS NULL AND id <> ?',
      [r.id],
    );
    if (other) {
      if (other.updated_at > (r.updated_at as string)) {
        r.is_pix = 0; // o PIX local é mais novo: a linha remota perde a marca
        r.updated_at = now();
        dirty = 1; // a correção precisa subir
      } else {
        await db.run('UPDATE groups SET is_pix = 0, dirty = 1, updated_at = ? WHERE id = ?', [now(), other.id]);
      }
    }
  }

  const cols = spec.columns;
  const nonKey = cols.filter((c) => !spec.key.includes(c));
  await db.run(
    `INSERT INTO ${spec.name} (${cols.join(', ')}, dirty) VALUES (${cols.map(() => '?').join(', ')}, ?)
     ON CONFLICT (${spec.key.join(', ')}) DO UPDATE SET
       ${nonKey.map((c) => `${c} = excluded.${c}`).join(', ')}, dirty = excluded.dirty`,
    [...cols.map((c) => r[c]), dirty],
  );
  return true;
}

async function pull(db: Db, remote: Remote, spec: TableSpec, pageSize: number, now: () => string): Promise<number> {
  const stateKey = `cursor:${spec.name}`;
  const stored = Number((await getState(db, stateKey)) ?? 0);
  let after = Math.max(stored - OVERLAP, 0);
  let cursor = stored;
  let applied = 0;
  for (;;) {
    const page = await remote.fetchAfter(spec.name, after, pageSize);
    if (page.length === 0) break;
    let maxSeq = after;
    await db.transaction(async () => {
      for (const row of page) {
        maxSeq = Math.max(maxSeq, Number(row.server_seq));
        if (await applyRow(db, spec, row, now)) applied++;
      }
      cursor = Math.max(cursor, maxSeq);
      await setState(db, stateKey, String(cursor));
    });
    if (page.length < pageSize) break;
    after = maxSeq;
  }
  return applied;
}

// ── API ──────────────────────────────────────────────────────────────────────
/** Envia o que está pendente e traz o que mudou no servidor. Rejeita se a rede falhar. */
export async function syncOnce(db: Db, remote: Remote, opts: SyncOptions): Promise<SyncResult> {
  const stored = await getState(db, 'user_id');
  if (stored && stored !== opts.userId) {
    throw new SyncError('ACCOUNT_MISMATCH', 'Os dados deste aparelho pertencem a outra conta.');
  }
  if (!stored) await setState(db, 'user_id', opts.userId); // dados anteriores ao login: adota a conta

  const now = opts.now ?? (() => new Date().toISOString());
  let pushed = 0;
  let pulled = 0;
  for (const spec of SYNC_TABLES) {
    pushed += await push(db, remote, spec, opts.userId, opts.pushBatch ?? DEFAULT_BATCH);
  }
  for (const spec of SYNC_TABLES) {
    pulled += await pull(db, remote, spec, opts.pageSize ?? DEFAULT_PAGE, now);
  }
  return { pushed, pulled, changedLocal: pulled > 0 };
}

/** Quantas linhas aguardam envio. */
export async function pendingCount(db: Db): Promise<number> {
  let total = 0;
  for (const spec of SYNC_TABLES) {
    const row = await db.first<{ n: number }>(`SELECT COUNT(*) AS n FROM ${spec.name} WHERE dirty = 1`);
    total += row?.n ?? 0;
  }
  return total;
}

/** Apaga todos os dados locais e o estado de sincronização (sair da conta). */
export async function resetLocal(db: Db): Promise<void> {
  await db.transaction(async () => {
    for (const spec of SYNC_TABLES) await db.run(`DELETE FROM ${spec.name}`);
    await db.run('DELETE FROM sync_state');
  });
}
