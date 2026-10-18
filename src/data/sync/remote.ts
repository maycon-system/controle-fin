export type RemoteRow = Record<string, unknown> & { server_seq?: number };

export interface Remote {
  /** Envia linhas (já no formato do servidor). Rejeita se falhar. */
  upsert(table: string, rows: RemoteRow[]): Promise<void>;
  /** Linhas com server_seq > after, em ordem crescente, no máximo `limit`. */
  fetchAfter(table: string, after: number, limit: number): Promise<RemoteRow[]>;
}
