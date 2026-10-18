import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors, fonts } from '../../ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted2,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Resumo', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="relatorio" options={{ title: 'Relatório', tabBarIcon: icon('document-text-outline') }} />
      <Tabs.Screen name="editar" options={{ title: 'Editar', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
