import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { formatBRL, type Cents } from '../domain/money';
import { Row, Txt } from './primitives';
import { colors } from './theme';

export interface Slice {
  key: string;
  label: string;
  value: Cents;
  color: string;
}

const R = 33;
const CIRC = 2 * Math.PI * R;

export function Donut({ slices, total }: { slices: Slice[]; total: Cents }) {
  const visible = slices.filter((s) => s.value > 0);
  const arcs = visible.reduce<{ s: Slice; dash: number; offset: number }[]>((acc, s) => {
    const prev = acc[acc.length - 1];
    acc.push({ s, dash: (s.value / total) * CIRC, offset: prev ? prev.offset + prev.dash : 0 });
    return acc;
  }, []);
  return (
    <Row style={{ gap: 14 }}>
      <View style={{ width: 90, height: 90 }}>
        <Svg width={90} height={90} viewBox="0 0 90 90">
          <G rotation={-90} origin="45, 45">
            <Circle cx={45} cy={45} r={R} fill="none" stroke="#f0f2f5" strokeWidth={10} />
            {arcs.map(({ s, dash, offset }) => (
              <Circle
                key={s.key}
                cx={45}
                cy={45}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={10}
                strokeDasharray={`${dash} ${CIRC}`}
                strokeDashoffset={-offset}
              />
            ))}
          </G>
        </Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Txt mono weight="medium" size={11}>
            {total >= 100000 ? `R$${(Math.round(total / 10000) / 10).toString().replace('.', ',')}k` : formatBRL(total).replace('R$ ', 'R$')}
          </Txt>
          <Txt size={8} color={colors.muted}>total</Txt>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {visible.length === 0 ? (
          <Txt size={13} color={colors.muted}>Sem gastos</Txt>
        ) : (
          visible.map((s) => (
            <Row key={s.key} style={{ marginBottom: 7, gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.color }} />
              <Txt size={11} color={colors.muted} style={{ flex: 1 }} numberOfLines={1}>{s.label}</Txt>
              <Txt mono weight="medium" size={11}>
                {formatBRL(s.value)}
                <Txt size={9} color={colors.muted}> {Math.round((s.value / total) * 100)}%</Txt>
              </Txt>
            </Row>
          ))
        )}
      </View>
    </Row>
  );
}

export function Bars({ items, total }: { items: Slice[]; total: Cents }) {
  const visible = items.filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  if (visible.length === 0) {
    return <Txt size={13} color={colors.muted} style={{ textAlign: 'center', paddingVertical: 12 }}>Nenhum gasto ainda.</Txt>;
  }
  return (
    <View>
      {visible.map((s) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        return (
          <View key={s.key} style={{ marginBottom: 10 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <Row style={{ gap: 6, flex: 1 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.color }} />
                <Txt size={13} weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>{s.label}</Txt>
                <Txt size={11} color={colors.muted}>({pct.toFixed(1).replace('.', ',')}%)</Txt>
              </Row>
              <Txt mono size={13} color={colors.muted}>{formatBRL(s.value)}</Txt>
            </Row>
            <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: s.color, borderRadius: 2 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
