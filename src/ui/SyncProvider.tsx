import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { pendingCount, resetLocal, syncOnce, SyncError } from '../data/sync/engine';
import { createSupabaseRemote } from '../data/sync/supabaseRemote';
import { isNetworkError } from '../services/errors';
import { useAuth } from './AuthProvider';
import { useData, useDb } from './context';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

interface SyncCtx {
  status: SyncStatus;
  pending: number;
  lastSyncAt: string | null;
  error: string | null;
  /** Os dados deste aparelho são de outra conta. */
  accountMismatch: boolean;
  syncNow: () => Promise<void>;
  /** Apaga os dados deste aparelho (ex.: ao sair da conta ou trocar de conta). */
  discardLocal: () => Promise<void>;
}

const SyncContext = createContext<SyncCtx | null>(null);

const DEBOUNCE_MS = 3000;
const INTERVAL_MS = 60_000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const db = useDb();
  const { version, refresh } = useData();
  const userId = session?.user.id ?? null;

  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pending, setPending] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountMismatch, setAccountMismatch] = useState(false);

  const running = useRef(false);
  const queued = useRef(false);
  const selfBump = useRef(false); // evita agendar outra sincronização por causa do refresh() da própria sincronização

  const run = useCallback(async () => {
    if (!userId) return;
    if (running.current) {
      queued.current = true;
      return;
    }
    running.current = true;
    try {
      // Se pedirem outra sincronização durante esta, roda de novo ao terminar.
      do {
        queued.current = false;
        setStatus('syncing');
        try {
          const res = await syncOnce(db, createSupabaseRemote(), { userId });
          if (res.changedLocal) {
            selfBump.current = true;
            refresh();
          }
          setLastSyncAt(new Date().toISOString());
          setError(null);
          setAccountMismatch(false);
          setStatus('idle');
        } catch (e) {
          if (e instanceof SyncError) {
            setAccountMismatch(true);
            setError(e.message);
            setStatus('error');
          } else if (isNetworkError(e)) {
            setStatus('offline');
          } else {
            setError(e instanceof Error ? e.message : 'Erro de sincronização.');
            setStatus('error');
          }
        }
        setPending(await pendingCount(db));
      } while (queued.current);
    } finally {
      running.current = false;
    }
  }, [db, userId, refresh]);

  // Ao obter a sessão (primeiro uso e abertura do app).
  useEffect(() => {
    if (userId) void run();
  }, [userId, run]);

  // Depois de uma gravação local (com espera), e atualiza o contador de pendências.
  useEffect(() => {
    pendingCount(db).then(setPending);
    if (!userId) return;
    if (selfBump.current) {
      selfBump.current = false;
      return;
    }
    const t = setTimeout(() => void run(), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [version, userId, db, run]);

  // Volta ao primeiro plano e a cada minuto com o app aberto.
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void run();
    });
    const id = setInterval(() => void run(), INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [userId, run]);

  const discardLocal = useCallback(async () => {
    await resetLocal(db);
    setAccountMismatch(false);
    setError(null);
    setPending(0);
    refresh();
    if (userId) void run();
  }, [db, refresh, run, userId]);

  const value = useMemo(
    () => ({ status, pending, lastSyncAt, error, accountMismatch, syncNow: run, discardLocal }),
    [status, pending, lastSyncAt, error, accountMismatch, run, discardLocal],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncCtx {
  const c = useContext(SyncContext);
  if (!c) throw new Error('useSync fora do SyncProvider');
  return c;
}
