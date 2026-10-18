import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { BankEntry } from '../data/repos/bankEntries';
import { formatBRL, parseMoney } from '../domain/money';
import { useData, useMonth, useRepos } from './context';
import { Button, Field, Row, Sheet, Txt } from './primitives';
import { colors } from './theme';

const centsToInput = (c: number) => (c / 100).toFixed(2).replace('.', ',');

interface SheetProps {
  visible: boolean;
  onClose: () => void;
}

// Os formulários só existem enquanto a janela está aberta: cada abertura começa do zero.
export function BankSheet({ visible, onClose, balanceCents }: SheetProps & { balanceCents: number }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Saldo bancário">
      {visible ? <BankForm onClose={onClose} balanceCents={balanceCents} /> : null}
    </Sheet>
  );
}

function BankForm({ onClose, balanceCents }: { onClose: () => void; balanceCents: number }) {
  const repos = useRepos();
  const { month } = useMonth();
  const { refresh } = useData();
  const [add, setAdd] = useState('');
  const [set, setSet] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<BankEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    repos.bankEntries.listByMonth(month).then((h) => {
      if (!cancelled) setHistory(h);
    });
    return () => {
      cancelled = true;
    };
  }, [repos, month, balanceCents]);

  async function doAdd() {
    const c = parseMoney(add);
    if (!c) return setError('Digite um valor válido para adicionar.');
    await repos.bankEntries.add(month, c);
    refresh();
    setAdd('');
    setError('');
  }

  async function doSet() {
    const c = parseMoney(set);
    if (c === null) return setError('Digite um valor válido para o novo saldo.');
    await repos.bankEntries.set(month, c);
    refresh();
    onClose();
  }

  return (
    <View>
      <Txt size={12} color={colors.muted} upper weight="bold" style={{ marginBottom: 14 }}>
        Saldo atual do mês: <Txt mono color={colors.green} size={13}>{formatBRL(balanceCents)}</Txt>
      </Txt>
      <Row style={{ gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label="Adicionar ao saldo" value={add} onChangeText={setAdd} placeholder="Ex: 500,00" keyboardType="decimal-pad" />
        </View>
        <Button label="+ Adicionar" variant="green" onPress={doAdd} style={{ marginBottom: 13 }} />
      </Row>
      <Field label="Ou definir novo saldo total" value={set} onChangeText={setSet} placeholder="Ex: 1500,00" keyboardType="decimal-pad" />
      {error ? <Txt size={12} color={colors.red} style={{ marginBottom: 10 }}>{error}</Txt> : null}
      <Button label="Definir saldo" onPress={doSet} />
      <View style={{ marginTop: 18 }}>
        <Txt size={11} weight="bold" color={colors.muted} upper style={{ marginBottom: 6 }}>Histórico do mês</Txt>
        {history.length === 0 ? (
          <Txt size={13} color={colors.muted}>Nenhuma entrada ainda.</Txt>
        ) : (
          [...history].reverse().map((h) => (
            <Row key={h.id} style={{ justifyContent: 'space-between', paddingVertical: 7, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
              <Txt size={13} color={colors.muted}>
                {new Date(h.at).toLocaleDateString('pt-BR')} — {h.kind === 'add' ? 'Adição' : 'Definição'}
              </Txt>
              <Txt mono weight="medium" size={13} color={colors.green}>{formatBRL(h.amountCents)}</Txt>
            </Row>
          ))
        )}
      </View>
    </View>
  );
}

export function IncomeSheet({ visible, onClose, incomeCents }: SheetProps & { incomeCents: number }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Renda mensal">
      {visible ? <IncomeForm onClose={onClose} incomeCents={incomeCents} /> : null}
    </Sheet>
  );
}

function IncomeForm({ onClose, incomeCents }: { onClose: () => void; incomeCents: number }) {
  const repos = useRepos();
  const { month } = useMonth();
  const { refresh } = useData();
  const [value, setValue] = useState(incomeCents > 0 ? centsToInput(incomeCents) : '');
  const [error, setError] = useState('');

  async function save() {
    const c = parseMoney(value);
    if (!c) return setError('Digite um valor válido.');
    await repos.income.set(month, c);
    refresh();
    onClose();
  }

  return (
    <View>
      <Txt size={13} color={colors.muted} style={{ marginBottom: 14, lineHeight: 19 }}>
        O valor vale a partir deste mês e continua nos seguintes até você mudar de novo.
      </Txt>
      <Field label="Novo valor (R$)" value={value} onChangeText={setValue} placeholder="Ex: 5000,00" keyboardType="decimal-pad" autoFocus />
      {error ? <Txt size={12} color={colors.red} style={{ marginBottom: 10 }}>{error}</Txt> : null}
      <Button label="Salvar" onPress={save} />
    </View>
  );
}
