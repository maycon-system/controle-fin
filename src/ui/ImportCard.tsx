import * as DocumentPicker from 'expo-document-picker';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { View } from 'react-native';

import { applyImport } from '../data/importBackup';
import { formatBRL } from '../domain/money';
import { monthLabel } from '../domain/month';
import { parseBackup, type ImportPlan } from '../services/importer/parseBackup';
import { previewTotals } from '../services/importer/previewTotals';
import { useData, useDb } from './context';
import { Button, Card, Confirm, Row, SectionTitle, Txt } from './primitives';
import { colors } from './theme';

async function readPickedText(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (asset.file) return asset.file.text(); // web
  return (await fetch(asset.uri)).text(); // iPhone e Android: arquivo copiado para o cache
}

export function ImportCard() {
  const db = useDb();
  const { refresh } = useData();
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick() {
    setError('');
    setDone('');
    setPlan(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets[0]) return;
      let json: unknown;
      try {
        json = JSON.parse(await readPickedText(res.assets[0]));
      } catch {
        return setError('Não consegui ler o arquivo. Escolha o backup .json exportado pelo app antigo.');
      }
      setPlan(parseBackup(json, () => randomUUID()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível abrir o arquivo.');
    }
  }

  async function run() {
    if (!plan) return;
    setConfirm(false);
    setBusy(true);
    setError('');
    try {
      await applyImport({ db, newId: () => randomUUID(), now: () => new Date().toISOString() }, plan);
      refresh();
      setDone(
        `Importado: ${plan.groups.length} grupos, ${plan.entries.length + plan.recurrences.length} itens e ${plan.income.length} meses de renda. ` +
          'Os dados anteriores foram substituídos e vão sincronizar com os outros aparelhos.',
      );
      setPlan(null);
    } catch (e) {
      setError('A importação falhou e nada foi alterado: ' + (e instanceof Error ? e.message : 'erro desconhecido'));
    } finally {
      setBusy(false);
    }
  }

  const totals = plan ? previewTotals(plan) : [];

  return (
    <View style={{ marginTop: 18 }}>
      <SectionTitle>Importar do app antigo</SectionTitle>
      <Card>
        <Txt size={13} color={colors.muted} style={{ lineHeight: 19, marginBottom: 12 }}>
          Escolha o arquivo de backup (.json) que o app antigo exportou. Você vê uma prévia antes de confirmar.
        </Txt>
        <Button label="Escolher arquivo de backup" variant="soft" onPress={() => void pick()} disabled={busy} />

        {error ? <Txt size={13} color={colors.red} style={{ marginTop: 12, lineHeight: 19 }}>{error}</Txt> : null}
        {done ? <Txt size={13} color={colors.greenDark} style={{ marginTop: 12, lineHeight: 19 }}>{done}</Txt> : null}

        {plan ? (
          <View style={{ marginTop: 14 }}>
            <Txt size={11} weight="bold" color={colors.muted} upper style={{ marginBottom: 6 }}>O que será importado</Txt>
            {[
              ['Grupos', plan.groups.length],
              ['Categorias', plan.categories.length],
              ['Lançamentos', plan.entries.length],
              ['Fixos e parcelados', plan.recurrences.length],
              ['Valores ajustados em um mês', plan.overrides.length],
              ['Meses com renda', plan.income.length],
              ['Entradas de saldo bancário', plan.bankEntries.length],
            ].map(([label, n]) => (
              <Row key={label as string} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                <Txt size={13}>{label}</Txt>
                <Txt mono size={13} color={colors.muted}>{n}</Txt>
              </Row>
            ))}

            {totals.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <Txt size={11} weight="bold" color={colors.muted} upper style={{ marginBottom: 2 }}>Gasto por mês (confira com o app antigo)</Txt>
                {totals.map((t) => (
                  <Row key={t.month} style={{ justifyContent: 'space-between', paddingVertical: 4, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
                    <Txt size={13}>{monthLabel(t.month, true)}</Txt>
                    <Txt mono size={13} color={colors.muted}>{formatBRL(t.spentCents)}</Txt>
                  </Row>
                ))}
              </View>
            ) : null}

            {plan.warnings.length > 0 ? (
              <View style={{ backgroundColor: colors.amberBg, borderRadius: 10, padding: 12, marginTop: 12 }}>
                <Txt size={11} weight="bold" color={colors.amber} upper style={{ marginBottom: 4 }}>Avisos</Txt>
                {plan.warnings.map((w) => (
                  <Txt key={w} size={12} color={colors.amber} style={{ lineHeight: 18, marginTop: 2 }}>• {w}</Txt>
                ))}
              </View>
            ) : null}

            <Button
              label="Importar e substituir tudo"
              variant="danger"
              onPress={() => setConfirm(true)}
              disabled={busy}
              style={{ marginTop: 14 }}
            />
          </View>
        ) : null}
      </Card>

      <Confirm
        visible={confirm}
        title="Substituir todos os dados?"
        message="Isto apaga os grupos, categorias, lançamentos, renda e saldo que estão no app agora e coloca os do backup no lugar. Os dados atuais também somem dos outros aparelhos ligados à sua conta."
        confirmLabel="Importar"
        onConfirm={() => void run()}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}
