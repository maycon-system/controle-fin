import { View } from 'react-native';

import { Txt } from './primitives';
import { useSync } from './SyncProvider';
import { colors } from './theme';

/** Ponto + texto curto com o estado da sincronização. */
export function SyncBadge() {
  const { status, pending } = useSync();

  let color: string = colors.green;
  let text = 'Sincronizado';
  if (status === 'syncing') {
    color = colors.blue;
    text = 'Sincronizando…';
  } else if (status === 'offline') {
    color = colors.muted;
    text = pending > 0 ? `Sem conexão · ${pending} pendentes` : 'Sem conexão';
  } else if (status === 'error') {
    color = colors.red;
    text = 'Erro de sincronização';
  } else if (pending > 0) {
    color = colors.amber;
    text = `${pending} ${pending === 1 ? 'pendente' : 'pendentes'}`;
  }

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Sincronização: ${text}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Txt size={10} color={colors.muted}>{text}</Txt>
    </View>
  );
}
