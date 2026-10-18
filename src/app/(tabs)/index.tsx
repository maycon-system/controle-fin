import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { formatBRL } from '../../domain/money';
import { Bars, Donut, type Slice } from '../../ui/charts';
import { useMonthData } from '../../ui/context';
import { BankSheet, IncomeSheet } from '../../ui/MoneySheets';
import { MonthHeader } from '../../ui/MonthHeader';
import { Button, Card, Row, Screen, SectionTitle, Txt } from '../../ui/primitives';
import { colors } from '../../ui/theme';

export default function Resumo() {
  const router = useRouter();
  const { data } = useMonthData();
  const [bankOpen, setBankOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);

  if (!data) {
    return (
      <>
        <MonthHeader />
        <Screen><Txt color={colors.muted}>Carregando…</Txt></Screen>
      </>
    );
  }

  const { groups, categories, occurrences, summary, incomeCents, bankCents } = data;

  if (groups.length === 0) {
    return (
      <>
        <MonthHeader />
        <Screen>
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Txt size={18} weight="bold" style={{ marginBottom: 6 }}>Bem-vindo ao Controle.fin</Txt>
            <Txt color={colors.muted} style={{ textAlign: 'center', lineHeight: 21, marginBottom: 18 }}>
              Comece criando o seu primeiro grupo de gastos, como “Nubank” ou “PIX”.
            </Txt>
            <Button label="Criar primeiro grupo" onPress={() => router.push('/editar')} />
          </Card>
        </Screen>
      </>
    );
  }

  const heroBg =
    summary.bankAvailableCents <= 10000 ? colors.red : summary.bankAvailableCents <= 30000 ? colors.amber : colors.green;
  const pixGroup = groups.find((g) => g.isPix);
  const pixTotal = pixGroup ? summary.byGroup[pixGroup.id] ?? 0 : 0;

  const groupSlices: Slice[] = groups.map((g) => ({
    key: g.id, label: g.name, value: summary.byGroup[g.id] ?? 0, color: g.color,
  }));

  const byCat: Record<string, number> = {};
  for (const o of occurrences) byCat[o.categoryId ?? 'none'] = (byCat[o.categoryId ?? 'none'] ?? 0) + o.amountCents;
  const catSlices: Slice[] = [
    ...categories.map((c) => ({ key: c.id, label: c.name, value: byCat[c.id] ?? 0, color: c.color })),
    { key: 'none', label: 'Sem categoria', value: byCat.none ?? 0, color: colors.muted },
  ];

  return (
    <>
      <MonthHeader />
      <Screen>
        <Pressable accessibilityRole="button" onPress={() => setBankOpen(true)}>
          <View style={{ backgroundColor: heroBg, borderRadius: 20, padding: 20, marginBottom: 10 }}>
            <Txt size={10} weight="bold" color="rgba(255,255,255,0.7)" upper>Saldo bancário</Txt>
            <Txt mono size={32} color="#fff" style={{ marginVertical: 2 }}>{formatBRL(summary.bankAvailableCents)}</Txt>
            <Txt size={10} color="rgba(255,255,255,0.7)">
              {pixGroup
                ? `${formatBRL(bankCents)} − ${formatBRL(pixTotal)} ${pixGroup.name}`
                : `${formatBRL(bankCents)} · toque para editar`}
            </Txt>
          </View>
        </Pressable>

        <Card style={{ padding: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Txt size={10} weight="medium" color={colors.muted} upper>Saldo disponível</Txt>
              <Txt mono size={21} style={{ marginTop: 3 }} color={summary.balanceCents < 0 ? colors.red : colors.text}>
                {formatBRL(summary.balanceCents)}
              </Txt>
            </View>
            <View style={{ backgroundColor: colors.greenBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Txt size={10} weight="bold" color={colors.greenDark}>{summary.balancePct}% da renda</Txt>
            </View>
          </Row>
        </Card>

        <Row style={{ justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 2 }}>
          <Row style={{ gap: 6 }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.blue }} />
            <Txt size={12} color={colors.muted}>Renda mensal</Txt>
          </Row>
          <Row style={{ gap: 8 }}>
            <Txt mono weight="medium" size={12}>{formatBRL(incomeCents)}</Txt>
            <Button label="editar" variant="ghost" small onPress={() => setIncomeOpen(true)} />
          </Row>
        </Row>

        <SectionTitle>Grupos</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              onPress={() => router.push(`/grupo/${g.id}`)}
              style={{
                width: '48.5%', backgroundColor: colors.card, borderColor: colors.border,
                borderWidth: 1, borderRadius: 14, padding: 12, overflow: 'hidden',
              }}>
              <View style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 3, backgroundColor: g.color, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
              <Txt size={10} weight="bold" color={g.color} upper style={{ marginTop: 5, marginBottom: 6 }}>{g.name}</Txt>
              <Txt mono size={16}>{formatBRL(summary.byGroup[g.id] ?? 0)}</Txt>
              <Txt size={9} color={colors.muted} style={{ marginTop: 2 }}>
                {occurrences.filter((o) => o.groupId === g.id).length} itens
              </Txt>
            </Pressable>
          ))}
        </View>

        <Card>
          <SectionTitle>Distribuição dos gastos</SectionTitle>
          <Donut slices={groupSlices} total={summary.spentCents} />
        </Card>

        <Card>
          <SectionTitle>Gastos por categoria</SectionTitle>
          <Bars items={catSlices} total={summary.spentCents} />
        </Card>
      </Screen>

      <BankSheet visible={bankOpen} onClose={() => setBankOpen(false)} balanceCents={bankCents} />
      <IncomeSheet visible={incomeOpen} onClose={() => setIncomeOpen(false)} incomeCents={incomeCents} />
    </>
  );
}
