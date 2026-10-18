import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../ui/AuthProvider';
import { Button, Card, Field, Screen, Txt } from '../ui/primitives';
import { colors } from '../ui/theme';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError('Digite o e-mail e a senha.');
    setBusy(true);
    setError('');
    const msg = await signIn(email, password);
    // Se deu certo, a proteção de rotas troca de tela sozinha.
    if (msg) setError(msg);
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 28 }}>
          <View
            style={{
              width: 52, height: 52, borderRadius: 14, backgroundColor: colors.green,
              alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
            <Txt weight="bold" size={20} color="#fff">R$</Txt>
          </View>
          <Txt size={22} weight="bold">Controle.fin</Txt>
          <Txt color={colors.muted} style={{ marginTop: 4 }}>Entre para sincronizar seus dados</Txt>
        </View>

        <Card>
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
          />
          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={submit}
          />
          {error ? (
            <Txt size={13} color={colors.red} style={{ marginBottom: 12 }} accessibilityRole="alert">
              {error}
            </Txt>
          ) : null}
          <Button label={busy ? 'Entrando…' : 'Entrar'} onPress={submit} disabled={busy} />
        </Card>
        <Txt size={12} color={colors.muted} style={{ textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
          Esta conta é pessoal. Não há cadastro pelo app.
        </Txt>
      </Screen>
    </SafeAreaView>
  );
}
