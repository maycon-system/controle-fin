import { useState } from 'react';
import { View } from 'react-native';

import { resetLocal } from '../data/sync/engine';
import { useAuth } from './AuthProvider';
import { useData, useDb } from './context';
import { Button, Card, Confirm, Row, SectionTitle, Txt } from './primitives';
import { useSync } from './SyncProvider';
import { colors } from './theme';

const STATUS_TEXT = {
  idle: 'Sincronizado',
  syncing: 'Sincronizando…',
  offline: 'Sem conexão',
  error: 'Erro de sincronização',
} as const;

export function AccountCard() {
  const { session, signOut } = useAuth();
  const db = useDb();
  const { refresh } = useData();
  const { status, pending, lastSyncAt, error, accountMismatch, syncNow, discardLocal } = useSync();
  const [confirmOut, setConfirmOut] = useState(false);

  async function leave() {
    setConfirmOut(false);
    await resetLocal(db); // dados deste aparelho saem junto com a conta
    refresh();
    await signOut();
  }

  return (
    <View style={{ marginTop: 18 }}>
      <SectionTitle>Conta</SectionTitle>
      <Card>
        <Txt weight="medium">{session?.user.email ?? '—'}</Txt>
        <Txt size={12} color={colors.muted} style={{ marginTop: 4 }}>
          {STATUS_TEXT[status]}
          {pending > 0 ? ` · ${pending} ${pending === 1 ? 'alteração pendente' : 'alterações pendentes'}` : ''}
          {lastSyncAt ? ` · última às ${new Date(lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </Txt>
        {error ? (
          <Txt size={12} color={colors.red} style={{ marginTop: 6, lineHeight: 17 }}>{error}</Txt>
        ) : null}

        {accountMismatch ? (
          <View style={{ backgroundColor: colors.amberBg, borderRadius: 10, padding: 12, marginTop: 12 }}>
            <Txt size={12} color={colors.amber} style={{ lineHeight: 18, marginBottom: 10 }}>
              Os dados deste aparelho são de outra conta. Para continuar com esta conta, apague os dados locais
              (o que estiver sincronizado volta do servidor).
            </Txt>
            <Button label="Apagar dados deste aparelho e continuar" variant="danger" small onPress={discardLocal} />
          </View>
        ) : null}

        <Row style={{ gap: 8, marginTop: 14 }}>
          <Button label="Sincronizar agora" variant="soft" onPress={() => void syncNow()} style={{ flex: 1 }} disabled={status === 'syncing'} />
          <Button label="Sair" variant="ghost" onPress={() => (pending > 0 ? setConfirmOut(true) : void leave())} style={{ flex: 1 }} />
        </Row>
      </Card>

      <Confirm
        visible={confirmOut}
        title="Sair da conta"
        message={`Há ${pending} ${pending === 1 ? 'alteração' : 'alterações'} ainda não enviada${pending === 1 ? '' : 's'}. Elas serão perdidas neste aparelho. Tente "Sincronizar agora" antes, se estiver online.`}
        confirmLabel="Sair mesmo assim"
        onConfirm={() => void leave()}
        onCancel={() => setConfirmOut(false)}
      />
    </View>
  );
}
