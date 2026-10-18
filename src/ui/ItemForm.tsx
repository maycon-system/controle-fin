import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { adjustOnlyThisMonth } from '../data/actions';
import type { Category } from '../data/repos/categories';
import { installmentAmount } from '../domain/installments';
import { formatBRL, parseMoney } from '../domain/money';
import type { YearMonth } from '../domain/month';
import type { Occurrence, Recurrence } from '../domain/types';
import { useData, useRepos } from './context';
import { Button, ChipRow, Field, Row, Sheet, Txt } from './primitives';
import { colors } from './theme';

type Kind = 'variable' | 'fixed' | 'installment';

const centsToInput = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  month: YearMonth;
  categories: Category[];
  /** Ocorrência sendo editada; `null` para um item novo. */
  editing: Occurrence | null;
}

// O formulário só existe enquanto a janela está aberta: cada abertura começa do zero.
export function ItemForm(props: Props) {
  return (
    <Sheet visible={props.visible} onClose={props.onClose} title={props.editing ? 'Editar item' : 'Novo item'}>
      {props.visible ? <ItemFormBody key={props.editing?.key ?? 'new'} {...props} /> : null}
    </Sheet>
  );
}

function ItemFormBody({ onClose, groupId, month, categories, editing }: Props) {
  const repos = useRepos();
  const { refresh } = useData();

  const [desc, setDesc] = useState(editing?.description ?? '');
  const [value, setValue] = useState(editing?.source === 'entry' ? centsToInput(editing.amountCents) : '');
  const [kind, setKind] = useState<Kind>(editing?.kind ?? 'variable');
  const [dueDay, setDueDay] = useState('');
  const [count, setCount] = useState('');
  const [first, setFirst] = useState('1');
  const [cat, setCat] = useState<string>(editing?.categoryId ?? 'none');
  const [scope, setScope] = useState<'whole' | 'month'>('whole');
  const [rec, setRec] = useState<Recurrence | null>(null);
  const [error, setError] = useState('');

  // Itens recorrentes: carrega a regra (valor total, parcelas, vencimento) ao abrir.
  useEffect(() => {
    if (!editing || editing.source !== 'recurrence') return;
    let cancelled = false;
    repos.recurrences.get(editing.sourceId).then((r) => {
      if (cancelled || !r) return;
      setRec(r);
      setValue(centsToInput(r.kind === 'installment' ? r.totalCents : r.amountCents));
      setDueDay(r.dueDay ? String(r.dueDay) : '');
      setCount(r.installments ? String(r.installments) : '');
      setFirst(String(r.firstInstallment));
    });
    return () => {
      cancelled = true;
    };
  }, [editing, repos]);

  const isRecurrenceEdit = !!editing && editing.source === 'recurrence';
  const onlyThisMonth = isRecurrenceEdit && scope === 'month';

  // Pré-visualização do parcelamento
  const cents = parseMoney(value);
  const n = parseInt(count, 10);
  const k = parseInt(first, 10) || 1;
  let preview = '';
  if (kind === 'installment' && !onlyThisMonth) {
    if (cents && n >= 2) {
      const a = installmentAmount(cents, n, 1);
      const b = installmentAmount(cents, n, 2);
      preview = a === b ? `${n}× de ${formatBRL(b)}` : `1ª parcela ${formatBRL(a)} + ${n - 1}× de ${formatBRL(b)}`;
      if (!editing && k > 1) preview += ` · começando na parcela ${k}/${n}`;
    } else {
      preview = 'Digite o valor total da compra e o nº de parcelas — o app calcula cada parcela.';
    }
  }

  async function save() {
    if (!desc.trim() && !onlyThisMonth) return setError('Digite uma descrição.');
    if (!cents) return setError('Digite um valor válido.');

    if (editing && onlyThisMonth) {
      await adjustOnlyThisMonth(repos, editing.sourceId, month, cents);
    } else if (editing && editing.source === 'entry') {
      await repos.entries.update(editing.sourceId, {
        description: desc.trim(), amountCents: cents, categoryId: cat === 'none' ? null : cat,
      });
    } else if (editing && rec) {
      const patch = { description: desc.trim(), categoryId: cat === 'none' ? null : cat };
      if (rec.kind === 'fixed') {
        const d = parseInt(dueDay, 10);
        if (!d || d < 1 || d > 31) return setError('Informe o dia de vencimento (1 a 31).');
        await repos.recurrences.update(rec.id, { ...patch, amountCents: cents, dueDay: d });
      } else {
        if (!(n >= 2 && n <= 120)) return setError('Informe o nº de parcelas (2 a 120).');
        if (rec.firstInstallment > n) return setError('O nº de parcelas não pode ser menor que a parcela inicial.');
        await repos.recurrences.update(rec.id, { ...patch, totalCents: cents, installments: n });
      }
    } else {
      const base = { groupId, categoryId: cat === 'none' ? null : cat, description: desc.trim() };
      if (kind === 'variable') {
        await repos.entries.create({ ...base, amountCents: cents, month, occurredOn: today() });
      } else if (kind === 'fixed') {
        const d = parseInt(dueDay, 10);
        if (!d || d < 1 || d > 31) return setError('Informe o dia de vencimento (1 a 31).');
        await repos.recurrences.create({
          ...base, kind: 'fixed', amountCents: cents, totalCents: 0, startMonth: month,
          endMonth: null, installments: 0, firstInstallment: 1, dueDay: d,
        });
      } else {
        if (!(n >= 2 && n <= 120)) return setError('Informe o nº de parcelas (2 a 120).');
        if (k < 1 || k > n) return setError('A parcela inicial deve estar entre 1 e o nº de parcelas.');
        await repos.recurrences.create({
          ...base, kind: 'installment', amountCents: 0, totalCents: cents, startMonth: month,
          endMonth: null, installments: n, firstInstallment: k, dueDay: null,
        });
      }
    }
    refresh();
    onClose();
  }

  const kindOptions = [
    { value: 'variable' as Kind, label: 'Variável' },
    { value: 'fixed' as Kind, label: 'Fixo (repete)' },
    { value: 'installment' as Kind, label: 'Parcelado' },
  ];

  return (
    <View>
      {isRecurrenceEdit ? (
        <ChipRow
          label="O que alterar?"
          value={scope}
          onChange={(v) => {
            setScope(v);
            if (v === 'month' && editing) setValue(centsToInput(editing.amountCents));
            else if (rec) setValue(centsToInput(rec.kind === 'installment' ? rec.totalCents : rec.amountCents));
          }}
          options={[
            { value: 'whole', label: rec?.kind === 'installment' ? 'Compra inteira' : 'Todos os meses' },
            { value: 'month', label: 'Só este mês' },
          ]}
        />
      ) : null}

      {!onlyThisMonth ? (
        <Field label="Descrição" value={desc} onChangeText={setDesc} placeholder="Ex: Tim, Mercado, Claude…" autoFocus={!editing} />
      ) : null}

      <Field
        label={onlyThisMonth ? 'Valor deste mês (R$)' : kind === 'installment' ? 'Valor total da compra (R$)' : 'Valor (R$)'}
        value={value}
        onChangeText={setValue}
        placeholder="0,00"
        keyboardType="decimal-pad"
      />

      {!editing ? <ChipRow label="Tipo" value={kind} onChange={setKind} options={kindOptions} /> : null}

      {!onlyThisMonth && kind === 'fixed' ? (
        <Field label="Dia de vencimento" value={dueDay} onChangeText={setDueDay} placeholder="Ex: 10" keyboardType="number-pad" />
      ) : null}

      {!onlyThisMonth && kind === 'installment' ? (
        <Row style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Nº de parcelas" value={count} onChangeText={setCount} placeholder="Ex: 12" keyboardType="number-pad" />
          </View>
          {!editing ? (
            <View style={{ flex: 1 }}>
              <Field label="Parcela inicial" value={first} onChangeText={setFirst} placeholder="1" keyboardType="number-pad" />
            </View>
          ) : null}
        </Row>
      ) : null}

      {preview ? (
        <View style={{ backgroundColor: colors.blueBg, borderRadius: 10, padding: 10, marginBottom: 13 }}>
          <Txt size={12} weight="medium" color={colors.blue} style={{ lineHeight: 18 }}>{preview}</Txt>
        </View>
      ) : null}

      {!onlyThisMonth ? (
        <ChipRow
          label="Categoria (opcional)"
          value={cat}
          onChange={setCat}
          options={[{ value: 'none', label: 'Sem categoria' }, ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color }))]}
        />
      ) : null}

      {error ? <Txt size={12} color={colors.red} style={{ marginBottom: 10 }}>{error}</Txt> : null}
      <Button label="Salvar" onPress={save} />
    </View>
  );
}
