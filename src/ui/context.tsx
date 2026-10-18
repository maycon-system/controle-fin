import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { loadMonth, type MonthData } from '../data/actions';
import type { Repos } from '../data/repos';
import { addMonths, monthOf, type YearMonth } from '../domain/month';

// ── Repositórios ────────────────────────────────────────────────────────────
const ReposContext = createContext<Repos | null>(null);

export function ReposProvider({ repos, children }: { repos: Repos; children: ReactNode }) {
  return <ReposContext.Provider value={repos}>{children}</ReposContext.Provider>;
}

export function useRepos(): Repos {
  const r = useContext(ReposContext);
  if (!r) throw new Error('useRepos fora do ReposProvider');
  return r;
}

// ── Mês selecionado ─────────────────────────────────────────────────────────
interface MonthCtx {
  month: YearMonth;
  setMonth: (m: YearMonth) => void;
  prev: () => void;
  next: () => void;
}

const MonthContext = createContext<MonthCtx | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState<YearMonth>(() => monthOf(new Date()));
  const value = useMemo<MonthCtx>(
    () => ({
      month,
      setMonth,
      prev: () => setMonth((m) => addMonths(m, -1)),
      next: () => setMonth((m) => addMonths(m, 1)),
    }),
    [month],
  );
  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthCtx {
  const c = useContext(MonthContext);
  if (!c) throw new Error('useMonth fora do MonthProvider');
  return c;
}

// ── Versão dos dados (para recarregar depois de escrever) ───────────────────
interface DataCtx {
  version: number;
  refresh: () => void;
}

const DataContext = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, refresh }), [version, refresh]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataCtx {
  const c = useContext(DataContext);
  if (!c) throw new Error('useData fora do DataProvider');
  return c;
}

/** Carrega os dados do mês selecionado e recarrega quando algo é gravado. */
export function useMonthData(): { data: MonthData | null; month: YearMonth } {
  const repos = useRepos();
  const { month } = useMonth();
  const { version } = useData();
  const [data, setData] = useState<MonthData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMonth(repos, month).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [repos, month, version]);

  return { data, month };
}
