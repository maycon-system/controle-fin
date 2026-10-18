import { randomUUID } from 'expo-crypto';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { Suspense, useMemo, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { wrapExpoDb } from '../data/expoDb';
import { migrate } from '../data/migrations';
import { createRepos } from '../data/repos';
import { DataProvider, DbProvider, MonthProvider, ReposProvider } from './context';
import { SyncProvider } from './SyncProvider';
import { colors } from './theme';

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.green} />
    </View>
  );
}

async function onInit(raw: SQLiteDatabase) {
  await migrate(wrapExpoDb(raw));
}

function Inner({ children }: { children: ReactNode }) {
  const raw = useSQLiteContext();
  const db = useMemo(() => wrapExpoDb(raw), [raw]);
  const repos = useMemo(
    () =>
      createRepos({
        db,
        newId: () => randomUUID(),
        now: () => new Date().toISOString(),
      }),
    [db],
  );
  return (
    <DbProvider db={db}>
      <ReposProvider repos={repos}>
        <MonthProvider>
          <DataProvider>
            <SyncProvider>{children}</SyncProvider>
          </DataProvider>
        </MonthProvider>
      </ReposProvider>
    </DbProvider>
  );
}

/** Banco local + estado do app. Precisa estar dentro do AuthProvider (a sincronização usa a sessão). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName="controlefin.db" onInit={onInit} useSuspense>
        <Inner>{children}</Inner>
      </SQLiteProvider>
    </Suspense>
  );
}
