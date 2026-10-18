import { Component, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { Button, Card, Txt } from './primitives';
import { colors } from './theme';

interface State {
  error: Error | null;
}

/** Na web o arquivo do banco só abre em uma aba por vez; mostra uma mensagem clara. */
export function describeDbError(error: Error): { title: string; body: string } {
  if (/access handle|createSyncAccessHandle|NoModificationAllowed/i.test(error.message)) {
    return {
      title: 'O Controle.fin já está aberto em outra aba',
      body: 'Neste navegador o banco de dados local só pode ficar aberto em uma aba por vez. Feche a outra aba do Controle.fin e recarregue esta.',
    };
  }
  return {
    title: 'Não foi possível abrir o banco de dados local',
    body: error.message,
  };
}

export class DbErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private retry = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
    else this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { title, body } = describeDbError(error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg }}>
        <Card>
          <Txt size={17} weight="bold" style={{ marginBottom: 8 }}>{title}</Txt>
          <Txt color={colors.muted} style={{ lineHeight: 21, marginBottom: 16 }}>{body}</Txt>
          <Button label="Tentar de novo" onPress={this.retry} />
        </Card>
      </View>
    );
  }
}
