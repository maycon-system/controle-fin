import type { Remote, RemoteRow } from '../../sync/remote';
import { SYNC_TABLES } from '../../sync/tables';

/**
 * Servidor falso em memória com as mesmas regras do Supabase:
 * - última escrita vence (ignora updated_at mais antigo, como o gatilho sync_guard);
 * - cada gravação aceita recebe um server_seq crescente (sequência global);
 * - datas voltam no formato do Postgres ("+00:00"), para exercitar a normalização.
 */
export class FakeRemote implements Remote {
  private store = new Map<string, RemoteRow>();
  private seq = 0;
  private failures = 0;
  fetchCalls: { table: string; after: number; limit: number }[] = [];
  /** Gancho de teste: roda dentro de upsert, antes de gravar. */
  beforeUpsert?: (table: string, rows: RemoteRow[]) => Promise<void> | void;

  failNext(n: number) {
    this.failures = n;
  }

  private maybeFail() {
    if (this.failures > 0) {
      this.failures--;
      throw new Error('network');
    }
  }

  private keyOf(table: string, row: RemoteRow) {
    const spec = SYNC_TABLES.find((t) => t.name === table)!;
    return table + '|' + spec.key.map((k) => String(row[k])).join('|');
  }

  private normalize(table: string, row: RemoteRow): RemoteRow {
    const spec = SYNC_TABLES.find((t) => t.name === table)!;
    const out: RemoteRow = { ...row };
    for (const c of spec.times) {
      if (out[c] != null) out[c] = new Date(out[c] as string).toISOString().replace('Z', '+00:00');
    }
    return out;
  }

  async upsert(table: string, rows: RemoteRow[]): Promise<void> {
    this.maybeFail();
    if (this.beforeUpsert) await this.beforeUpsert(table, rows);
    for (const incoming of rows) {
      const key = this.keyOf(table, incoming);
      const existing = this.store.get(key);
      if (existing && new Date(incoming.updated_at as string) < new Date(existing.updated_at as string)) {
        continue; // mais antiga que a gravada: ignora em silêncio
      }
      this.store.set(key, { ...this.normalize(table, incoming), server_seq: ++this.seq });
    }
  }

  async fetchAfter(table: string, after: number, limit: number): Promise<RemoteRow[]> {
    this.maybeFail();
    this.fetchCalls.push({ table, after, limit });
    return [...this.store.entries()]
      .filter(([k, r]) => k.startsWith(table + '|') && (r.server_seq as number) > after)
      .map(([, r]) => ({ ...r }))
      .sort((a, b) => (a.server_seq as number) - (b.server_seq as number))
      .slice(0, limit);
  }

  // ── Apoio aos testes ──────────────────────────────────────────────────────
  rows(table: string): RemoteRow[] {
    return [...this.store.entries()].filter(([k]) => k.startsWith(table + '|')).map(([, r]) => ({ ...r }));
  }

  currentSeq() {
    return this.seq;
  }

  /** Insere uma linha com um server_seq escolhido (simula gravação concorrente atrasada). */
  inject(table: string, row: RemoteRow, serverSeq: number) {
    this.store.set(this.keyOf(table, row), { ...this.normalize(table, row), server_seq: serverSeq });
  }
}
