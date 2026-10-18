import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { monthLabel } from '../domain/month';
import { useMonth } from './context';
import { Txt } from './primitives';
import { colors, MAX_WIDTH } from './theme';

/** Cabeçalho comum com o seletor de mês. */
export function MonthHeader() {
  const { month, prev, next } = useMonth();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
      <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', alignItems: 'center', paddingVertical: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.bg,
            borderColor: colors.border2,
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 6,
          }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={prev} hitSlop={8} style={{ padding: 8 }}>
            <Txt size={18} color={colors.muted}>‹</Txt>
          </Pressable>
          <Txt mono weight="medium" size={13} style={{ minWidth: 84, textAlign: 'center' }}>
            {monthLabel(month)}
          </Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={next} hitSlop={8} style={{ padding: 8 }}>
            <Txt size={18} color={colors.muted}>›</Txt>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
