import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, MAX_WIDTH, PALETTE } from './theme';

// ── Texto ───────────────────────────────────────────────────────────────────
interface TxtProps extends TextProps {
  size?: number;
  color?: string;
  weight?: 'regular' | 'medium' | 'bold';
  mono?: boolean;
  upper?: boolean;
}

export function Txt({ size = 14, color = colors.text, weight = 'regular', mono, upper, style, ...rest }: TxtProps) {
  const family = mono ? (weight === 'regular' ? fonts.mono : fonts.monoMedium) : fonts[weight];
  const base: TextStyle = {
    fontSize: size,
    color,
    fontFamily: family,
    ...(upper ? { textTransform: 'uppercase', letterSpacing: 1 } : null),
  };
  return <Text {...rest} style={[base, style]} />;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Txt size={10} weight="bold" color={colors.muted} upper style={{ marginBottom: 8 }}>
      {children}
    </Txt>
  );
}

// ── Contêineres ─────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const body = <View style={s.screenBody}>{children}</View>;
  return scroll ? (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      {body}
    </ScrollView>
  ) : (
    <View style={s.screen}>{body}</View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View style={{ padding: 28, alignItems: 'center' }}>
      <Txt color={colors.muted} style={{ textAlign: 'center', lineHeight: 21 }}>
        {children}
      </Txt>
    </View>
  );
}

// ── Botões ──────────────────────────────────────────────────────────────────
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'green' | 'ghost' | 'danger' | 'soft';
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', small, disabled, style }: ButtonProps) {
  const palette = {
    primary: { bg: colors.text, fg: '#fff', border: colors.text },
    green: { bg: colors.green, fg: '#fff', border: colors.green },
    ghost: { bg: colors.bg, fg: colors.muted, border: colors.border2 },
    danger: { bg: colors.redBg, fg: colors.red, border: colors.redBg },
    soft: { bg: colors.blueBg, fg: colors.blue, border: colors.blueBg },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <Txt size={small ? 12 : 15} weight="bold" color={palette.fg}>
        {label}
      </Txt>
    </Pressable>
  );
}

// ── Formulário ──────────────────────────────────────────────────────────────
export function Field({ label, style, ...rest }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 13 }}>
      <Txt size={11} weight="bold" color={colors.muted} upper style={{ marginBottom: 5 }}>
        {label}
      </Txt>
      <TextInput
        placeholderTextColor={colors.muted2}
        {...rest}
        style={[s.input, style]}
      />
    </View>
  );
}

interface ChipRowProps<T extends string> {
  label?: string;
  options: { value: T; label: string; color?: string }[];
  value: T | null;
  onChange: (v: T) => void;
}

export function ChipRow<T extends string>({ label, options, value, onChange }: ChipRowProps<T>) {
  return (
    <View style={{ marginBottom: 13 }}>
      {label ? (
        <Txt size={11} weight="bold" color={colors.muted} upper style={{ marginBottom: 6 }}>
          {label}
        </Txt>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[
                s.chip,
                on && { backgroundColor: o.color ?? colors.text, borderColor: o.color ?? colors.text },
              ]}>
              <Txt size={12} weight="medium" color={on ? '#fff' : colors.muted}>
                {o.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ColorPicks({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
      {PALETTE.map((c) => (
        <Pressable
          key={c}
          accessibilityRole="button"
          accessibilityLabel={`Cor ${c}`}
          onPress={() => onChange(c)}
          style={[s.swatch, { backgroundColor: c }, c === value && { borderColor: colors.text }]}
        />
      ))}
    </View>
  );
}

// ── Modais ──────────────────────────────────────────────────────────────────
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Txt size={16} weight="bold" style={{ marginBottom: 16 }}>
            {title}
          </Txt>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Confirm({
  visible,
  title,
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onCancel} title={title}>
      <Txt color={colors.muted} style={{ lineHeight: 21, marginBottom: 18 }}>
        {message}
      </Txt>
      <Row style={{ gap: 8 }}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={confirmLabel} variant="danger" onPress={onConfirm} style={{ flex: 1 }} />
      </Row>
    </Sheet>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenBody: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  btn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border2,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border2,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '90%',
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.muted2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
