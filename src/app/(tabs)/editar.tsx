import { useState } from 'react';
import { View } from 'react-native';

import type { Category } from '../../data/repos/categories';
import type { Group } from '../../data/repos/groups';
import { AccountCard } from '../../ui/AccountCard';
import { useData, useMonthData, useRepos } from '../../ui/context';
import { MonthHeader } from '../../ui/MonthHeader';
import {
  Button,
  Card,
  ChipRow,
  ColorPicks,
  Confirm,
  Empty,
  Field,
  Row,
  Screen,
  SectionTitle,
  Sheet,
  Txt,
} from '../../ui/primitives';
import { colors, PALETTE } from '../../ui/theme';

type Editing =
  | { type: 'group'; item: Group | null }
  | { type: 'category'; item: Category | null }
  | null;

type Deleting = { type: 'group'; item: Group; count: number } | { type: 'category'; item: Category } | null;

export default function Editar() {
  const repos = useRepos();
  const { refresh } = useData();
  const { data } = useMonthData();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);

  if (!data) {
    return (
      <>
        <MonthHeader />
        <Screen><Txt color={colors.muted}>Carregando…</Txt></Screen>
      </>
    );
  }

  const { groups, categories, occurrences } = data;
  const pixValue = groups.find((g) => g.isPix)?.id ?? 'none';

  async function confirmDelete() {
    if (!deleting) return;
    if (deleting.type === 'group') await repos.groups.remove(deleting.item.id);
    else await repos.categories.remove(deleting.item.id);
    setDeleting(null);
    refresh();
  }

  return (
    <>
      <MonthHeader />
      <Screen>
        <SectionTitle>Grupos</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {groups.length === 0 ? (
            <Empty>Nenhum grupo ainda. Crie o primeiro abaixo.</Empty>
          ) : (
            groups.map((g, i) => {
              const count = occurrences.filter((o) => o.groupId === g.id).length;
              return (
                <Row
                  key={g.id}
                  style={{ padding: 14, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: g.color }} />
                  <View style={{ flex: 1 }}>
                    <Txt weight="medium">{g.name}</Txt>
                    <Txt size={11} color={colors.muted}>
                      {count} {count === 1 ? 'item' : 'itens'} neste mês{g.isPix ? ' · abate do saldo bancário' : ''}
                    </Txt>
                  </View>
                  <Button label="Editar" variant="soft" small onPress={() => setEditing({ type: 'group', item: g })} />
                  <Button label="Excluir" variant="danger" small onPress={() => setDeleting({ type: 'group', item: g, count })} />
                </Row>
              );
            })
          )}
        </Card>
        <Button label="+ Criar novo grupo" variant="ghost" onPress={() => setEditing({ type: 'group', item: null })} style={{ marginBottom: 18 }} />

        {groups.length > 0 ? (
          <Card>
            <ChipRow
              label="Grupo PIX (abate do saldo bancário)"
              value={pixValue}
              onChange={async (v) => {
                await repos.groups.setPix(v === 'none' ? null : v);
                refresh();
              }}
              options={[{ value: 'none', label: 'Nenhum' }, ...groups.map((g) => ({ value: g.id, label: g.name, color: g.color }))]}
            />
          </Card>
        ) : null}

        <SectionTitle>Categorias</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {categories.length === 0 ? (
            <Empty>Nenhuma categoria ainda.</Empty>
          ) : (
            categories.map((c, i) => (
              <Row key={c.id} style={{ padding: 13, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />
                <Txt weight="medium" style={{ flex: 1 }}>{c.name}</Txt>
                <Button label="Editar" variant="soft" small onPress={() => setEditing({ type: 'category', item: c })} />
                <Button label="Remover" variant="danger" small onPress={() => setDeleting({ type: 'category', item: c })} />
              </Row>
            ))
          )}
        </Card>
        <Button label="+ Nova categoria" variant="ghost" onPress={() => setEditing({ type: 'category', item: null })} />

        <AccountCard />
      </Screen>

      <NameColorSheet
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={async (name, color) => {
          if (!editing) return;
          if (editing.type === 'group') {
            if (editing.item) await repos.groups.update(editing.item.id, { name, color });
            else await repos.groups.create({ name, color });
          } else if (editing.item) await repos.categories.update(editing.item.id, { name, color });
          else await repos.categories.create({ name, color });
          setEditing(null);
          refresh();
        }}
      />

      <Confirm
        visible={deleting !== null}
        title={deleting?.type === 'group' ? 'Excluir grupo' : 'Remover categoria'}
        message={
          deleting?.type === 'group'
            ? deleting.count > 0
              ? `O grupo “${deleting.item.name}” tem ${deleting.count} item(ns) neste mês. Todos os itens do grupo, de todos os meses, serão excluídos. Tem certeza?`
              : `Excluir o grupo “${deleting.item.name}”?`
            : `Remover a categoria “${deleting?.item.name ?? ''}”? Os itens que a usavam ficam sem categoria.`
        }
        confirmLabel={deleting?.type === 'group' ? 'Excluir' : 'Remover'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function NameColorSheet({
  editing,
  onClose,
  onSave,
}: {
  editing: Editing;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}) {
  // O formulário é remontado a cada abertura (key), então o estado inicial vem do item.
  const key = editing ? `${editing.type}:${editing.item?.id ?? 'new'}` : 'closed';
  return (
    <Sheet
      visible={editing !== null}
      onClose={onClose}
      title={
        editing
          ? `${editing.item ? 'Editar' : 'Novo'} ${editing.type === 'group' ? 'grupo' : 'categoria'}`
          : ''
      }>
      {editing ? <NameColorForm key={key} initial={editing.item} onSave={onSave} /> : null}
    </Sheet>
  );
}

function NameColorForm({
  initial,
  onSave,
}: {
  initial: { name: string; color: string } | null;
  onSave: (name: string, color: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PALETTE[0]);
  const [error, setError] = useState('');
  return (
    <View>
      <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex: Lazer, Saúde…" autoFocus />
      <Txt size={11} weight="bold" color={colors.muted} upper style={{ marginBottom: 8 }}>Cor</Txt>
      <ColorPicks value={color} onChange={setColor} />
      {error ? <Txt size={12} color={colors.red} style={{ marginBottom: 10 }}>{error}</Txt> : null}
      <Button
        label="Salvar"
        onPress={() => {
          if (!name.trim()) return setError('Digite um nome.');
          onSave(name.trim(), color);
        }}
      />
    </View>
  );
}
