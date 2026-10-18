import { supabase } from '../../services/supabase';
import type { Remote, RemoteRow } from './remote';
import { SYNC_TABLES } from './tables';

/** Implementação de `Remote` sobre o Supabase. O RLS garante que só as linhas da conta aparecem. */
export function createSupabaseRemote(): Remote {
  return {
    async upsert(table, rows) {
      if (rows.length === 0) return;
      const spec = SYNC_TABLES.find((t) => t.name === table);
      if (!spec) throw new Error(`Tabela desconhecida: ${table}`);
      const { error } = await supabase
        .from(table)
        .upsert(rows, { onConflict: ['user_id', ...spec.key].join(',') });
      if (error) throw new Error(`${table}: ${error.message}`);
    },

    async fetchAfter(table, after, limit) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .gt('server_seq', after)
        .order('server_seq', { ascending: true })
        .limit(limit);
      if (error) throw new Error(`${table}: ${error.message}`);
      return (data ?? []) as RemoteRow[];
    },
  };
}
