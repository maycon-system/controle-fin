import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { endRecurrenceFrom, skipThisMonth } from '../../data/actions';
import { formatBRL } from '../../domain/money';
import { monthLabel } from '../../domain/month';
import type { Occurrence } from '../../domain/types';
import { useData, useMonthData, useRepos } from '../../ui/context';
import { ItemForm } from '../../ui/ItemForm';
import { MonthHeader } from '../../ui/MonthHeader';
import { Button, Card, Confirm, Empty, Row, Screen, Sheet, Txt } from '../../ui/primitives';
import { colors } from '../../ui/theme';

const dateBR = (iso: string) => iso.split('-').reverse().join('/');

/** Linha de detalhe do item: vencimento (fixo), valor da compra (parcelado) e data de inserção. */
function detail(o: Occurrence): string {
  let text = '';
  if (o.kind === 'fixed' && o.dueDay) text = `Vence dia ${String(o.dueDay).padStart(2, '0')}`;
  else if (o.insertedOn) text = `Inserido em ${dateBR(o.insertedOn)}`;
  if (o.kind === 'installment' && o.totalCents) {
    text = `Compra de ${formatBRL(o.totalCents)}${text ? ` · ${text}` : ''}`;
  }
  return text;
}

export default function GrupoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const repos = useRepos();
  const { refresh } = useData();
  const { data, month } = useMonthData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [removing, setRemoving] = useState<Occurrence | null>(null);

  const group = data?.groups.find((g) => g.id === id);

  if (!data) {
    return (
      <>
        <MonthHeader />
        <Screen><Txt color={colors.muted}>Carregando…</Txt></Screen>
      </>
    );
  }
  if (!group) {
    return (
      <>
        <MonthHeader />
        <Screen>
          <Empty>Grupo não encontrado.</Empty>
          <Button label="Voltar" onPress={() => router.back()} />
        </Screen>
      </>
    );
  }

  const items = data.occurrences.filter((o) => o.groupId === group.id);
  const total = data.summary.byGroup[group.id] ?? 0;
  const catOf = (cid: string | null) => data.categories.find((c) => c.id === cid);

  async function removeEntry(o: Occurrence) {
    await repos.entries.remove(o.sourceId);
    setRemoving(null);
    refresh();
  }
  async function removeSkip(o: Occurrence) {
    await skipThisMonth(repos, o.sourceId, month);
    setRemoving(null);
    refresh();
  }
  async function removeFromHere(o: Occurrence) {
    await endRecurrenceFrom(repos, o.sourceId, month);
    setRemoving(null);
    refresh();
  }

  return (
    <>
      <MonthHeader />
      <Screen>
        <Row style={{ gap: 10, marginBottom: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.muted} />
          </Pressable>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: group.color }} />
          <Txt size={17} weight="bold" style={{ flex: 1 }}>{group.name}</Txt>
          <View style={{ backgroundColor: group.color + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Txt mono weight="medium" size={13} color={group.color}>{formatBRL(total)}</Txt>
          </View>
        </Row>

        <Pressable
          accessibilityRole="button"
          onPress={() => { setEditing(null); setFormOpen(true); }}
          style={{
            borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border2, borderRadius: 12,
            padding: 13, alignItems: 'center', marginBottom: 12,
          }}>
          <Txt weight="medium" color={colors.muted}>+ Adicionar item</Txt>
        </Pressable>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {items.length === 0 ? (
            <Empty>Nenhum item em {monthLabel(month, true)}.{'\n'}Toque em “+ Adicionar item”.</Empty>
          ) : (
            items.map((o, i) => {
              const cat = catOf(o.categoryId);
              const tag =
                o.kind === 'fixed' ? 'fixo' : o.kind === 'installment' && o.installment ? `${o.installment.current}/${o.installment.total}` : null;
              return (
                <Row key={o.key} style={{ padding: 13, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: group.color }} />
                  <View style={{ flex: 1 }}>
                    <Row style={{ flexWrap: 'wrap', gap: 6 }}>
                      <Txt weight="medium" style={{ flexShrink: 1 }}>{o.description}</Txt>
                      {cat ? (
                        <View style={{ backgroundColor: cat.color + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Txt size={10} weight="bold" color={cat.color} upper>{cat.name}</Txt>
                        </View>
                      ) : null}
                    </Row>
                    {detail(o) ? (
                      <Txt size={11} color={colors.muted} style={{ marginTop: 2 }}>{detail(o)}</Txt>
                    ) : null}
                    {o.overridden ? <Txt size={11} color={colors.amber} style={{ marginTop: 2 }}>valor ajustado neste mês</Txt> : null}
                  </View>
                  {tag ? (
                    <View style={{ backgroundColor: o.kind === 'installment' ? colors.blueBg : colors.bg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Txt size={10} weight="bold" upper color={o.kind === 'installment' ? colors.blue : colors.muted}>{tag}</Txt>
                    </View>
                  ) : null}
                  <Txt mono weight="medium">{formatBRL(o.amountCents)}</Txt>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${o.description}`} onPress={() => { setEditing(o); setFormOpen(true); }} hitSlop={6}>
                    <Ionicons name="create-outline" size={18} color={colors.muted} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Excluir ${o.description}`} onPress={() => setRemoving(o)} hitSlop={6}>
                    <Ionicons name="close" size={18} color={colors.muted2} />
                  </Pressable>
                </Row>
              );
            })
          )}
        </Card>
      </Screen>

      <ItemForm
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        groupId={group.id}
        month={month}
        categories={data.categories}
        editing={editing}
      />

      <Confirm
        visible={removing !== null && removing.source === 'entry'}
        title="Excluir item"
        message={`Excluir “${removing?.description ?? ''}”?`}
        onConfirm={() => removing && removeEntry(removing)}
        onCancel={() => setRemoving(null)}
      />

      <Sheet visible={removing !== null && removing.source === 'recurrence'} onClose={() => setRemoving(null)} title="Excluir item recorrente">
        <Txt color={colors.muted} style={{ lineHeight: 21, marginBottom: 16 }}>
          “{removing?.description}” se repete em vários meses. O que excluir?
        </Txt>
        <Button label={`Só em ${monthLabel(month, true)}`} variant="ghost" onPress={() => removing && removeSkip(removing)} style={{ marginBottom: 8 }} />
        <Button label="Este mês e os próximos" variant="danger" onPress={() => removing && removeFromHere(removing)} style={{ marginBottom: 8 }} />
        <Button label="Cancelar" variant="ghost" onPress={() => setRemoving(null)} />
      </Sheet>
    </>
  );
}
