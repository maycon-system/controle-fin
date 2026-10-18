import { randomUUID } from 'expo-crypto';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { Suspense, useMemo, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { wrapExpoDb } from '../data/expoDb';
import { migrate } from '../data/migrations';
import { createRepos } from '../data/repos';
import { DataProvider, MonthProvider, ReposProvider } from './context';
import { colors } from './theme';

function Loading() {
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
  const repos = useMemo(
    () =>
      createRepos({
        db: wrapExpoDb(raw),
        newId: () => randomUUID(),
        now: () => new Date().toISOString(),
      }),
    [raw],
  );
  return (
    <ReposProvider repos={repos}>
      <MonthProvider>
        <DataProvider>{children}</DataProvider>
      </MonthProvider>
    </ReposProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName="controlefin.db" onInit={onInit} useSuspense>
        <Inner>{children}</Inner>
      </SQLiteProvider>
    </Suspense>
  );
}
