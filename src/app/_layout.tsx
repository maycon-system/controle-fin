import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '../ui/AppProviders';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });
  // Se a fonte falhar, o app segue com a fonte do sistema em vez de ficar em branco.
  if (!loaded && !error) return null;

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
