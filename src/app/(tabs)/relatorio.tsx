import { useState } from 'react';
import { Platform, View } from 'react-native';

import { loadReport, type ReportData } from '../../data/reports';
import { formatBRL } from '../../domain/money';
import { MONTHS_FULL, monthLabel } from '../../domain/month';
import { buildPeriod, type Period, type ReportKind } from '../../domain/reportPeriod';
import { useRepos } from '../../ui/context';
import { MonthHeader } from '../../ui/MonthHeader';
import { Button, Card, ChipRow, Row, Screen, SectionTitle, Txt } from '../../ui/primitives';
import { runPdfAction, visibleActions } from '../../services/pdf/run';
import { pdfActions } from '../../services/pdf/share';
import type { PdfActionId } from '../../services/pdf/share.types';
import { colors } from '../../ui/theme';

type Kind = ReportKind;

interface Result extends ReportData {
  period: Period;
}

export default function Relatorio() {
  const repos = useRepos();
  const now = new Date();
  const thisYear = now.getFullYear();

  const [kind, setKind] = useState<Kind>('mensal');
  const [m1, setM1] = useState(String(now.getMonth()));
  const [m2, setM2] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(thisYear));
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [pdfMsg, setPdfMsg] = useState('');

  const monthOptions = MONTHS_FULL.map((n, i) => ({ value: String(i), label: n.slice(0, 3) }));
  const yearOptions = Array.from({ length: thisYear + 2 - 2025 + 1 }, (_, i) => String(2025 + i)).map((y) => ({
    value: y,
    label: y,
  }));

  async function generate() {
    setError('');
    const built = buildPeriod({ kind, year: Number(year), monthFrom: Number(m1), monthTo: Number(m2) });
    if (!built.ok) return setError(built.error);
    const data = await loadReport(repos, built.period.months);
    setResult({ ...data, period: built.period });
    setPdfMsg('');
  }

  function onPdf(id: PdfActionId) {
    setPdfMsg('');
    // runPdfAction chama a ação de forma síncrona (exigência do navegador para compartilhar/abrir).
    const ctx = result ? { period: result.period, data: result } : null;
    void runPdfAction(id, ctx, pdfActions).then((m) => setPdfMsg(m ?? ''));
  }

  const r = result?.report;
  const catRows = result
    ? [
        ...result.categories.map((c) => ({ key: c.id, name: c.name, color: c.color, value: r?.byCategory[c.id] ?? 0 })),
        { key: 'none', name: 'Sem categoria', color: colors.muted, value: r?.byCategory.none ?? 0 },
      ]
        .filter((c) => c.value > 0)
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <>
      <MonthHeader />
      <Screen>
        <ChipRow
          value={kind}
          onChange={(v) => { setKind(v); setResult(null); }}
          options={[
            { value: 'mensal', label: 'Mensal' },
            { value: 'periodo', label: 'Período' },
            { value: 'anual', label: 'Anual' },
          ]}
        />
        <Card>
          {kind !== 'anual' ? (
            <ChipRow label={kind === 'periodo' ? 'Mês inicial' : 'Mês'} value={m1} onChange={setM1} options={monthOptions} />
          ) : null}
          {kind === 'periodo' ? <ChipRow label="Mês final" value={m2} onChange={setM2} options={monthOptions} /> : null}
          <ChipRow label="Ano" value={year} onChange={setYear} options={yearOptions} />
          {error ? <Txt size={12} color={colors.red} style={{ marginBottom: 10 }}>{error}</Txt> : null}
          <Button label="Gerar relatório" onPress={generate} />
        </Card>

        {result && r ? (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ backgroundColor: colors.text, padding: 16 }}>
              <Txt weight="bold" color="#fff">{result.period.title}</Txt>
              <Txt size={11} color="rgba(255,255,255,0.55)">{result.period.subtitle}</Txt>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.border, gap: 1 }}>
              {[
                { label: 'Receita total', value: r.incomeCents, color: colors.green },
                { label: 'Gasto total', value: r.spentCents, color: colors.red },
                { label: 'Saldo', value: r.balanceCents, color: r.balanceCents >= 0 ? colors.green : colors.red },
                { label: 'Média mensal', value: r.averageSpentCents, color: colors.text },
              ].map((k) => (
                <View key={k.label} style={{ width: '49.9%', backgroundColor: colors.card, padding: 14 }}>
                  <Txt size={10} weight="medium" color={colors.muted} upper style={{ marginBottom: 4 }}>{k.label}</Txt>
                  <Txt mono weight="medium" size={15} color={k.color}>{formatBRL(k.value)}</Txt>
                </View>
              ))}
            </View>

            <View style={{ padding: 16 }}>
              <SectionTitle>Por grupo</SectionTitle>
              {result.groups.map((g) => (
                <BreakdownRow key={g.id} name={g.name} color={g.color} value={r.byGroup[g.id] ?? 0} />
              ))}
            </View>

            <View style={{ padding: 16, paddingTop: 0 }}>
              <SectionTitle>Por categoria</SectionTitle>
              {catRows.length === 0 ? (
                <Txt size={13} color={colors.muted}>Nenhum gasto no período.</Txt>
              ) : (
                catRows.map((c) => <BreakdownRow key={c.key} name={c.name} color={c.color} value={c.value} />)
              )}
            </View>

            {r.perMonth.length > 1 ? (
              <View style={{ padding: 16, paddingTop: 0 }}>
                <SectionTitle>Por mês</SectionTitle>
                {r.perMonth.map((m) => (
                  <View key={m.month} style={{ paddingVertical: 9, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
                    <Txt size={11} weight="bold" color={colors.muted} upper style={{ marginBottom: 4 }}>{monthLabel(m.month, true)}</Txt>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt mono size={12} color={colors.green}>{formatBRL(m.incomeCents)}</Txt>
                      <Txt mono size={12} color={colors.red}>{formatBRL(m.spentCents)}</Txt>
                      <Txt mono size={12} color={m.balanceCents >= 0 ? colors.green : colors.red}>{formatBRL(m.balanceCents)}</Txt>
                    </Row>
                  </View>
                ))}
                <Txt size={10} color={colors.muted} style={{ marginTop: 6 }}>Receita · Gasto · Saldo</Txt>
              </View>
            ) : null}
          </Card>
        ) : null}

        {result ? (
          <View style={{ marginTop: 4, marginBottom: 8 }}>
            {visibleActions(Platform.OS).includes('share') ? (
              <Button label="📤 Compartilhar PDF" variant="green" onPress={() => onPdf('share')} style={{ marginBottom: 8 }} />
            ) : null}
            <Row style={{ gap: 8 }}>
              {visibleActions(Platform.OS).includes('open') ? (
                <Button label="🌐 Abrir PDF" variant="ghost" onPress={() => onPdf('open')} style={{ flex: 1 }} />
              ) : null}
              {visibleActions(Platform.OS).includes('download') ? (
                <Button label="💾 Baixar PDF" variant="ghost" onPress={() => onPdf('download')} style={{ flex: 1 }} />
              ) : null}
              <Button label="🖨️ Imprimir" variant="ghost" onPress={() => onPdf('print')} style={{ flex: 1 }} />
            </Row>
            {pdfMsg ? (
              <Txt size={12} color={colors.muted} style={{ textAlign: 'center', marginTop: 10, lineHeight: 18 }}>
                {pdfMsg}
              </Txt>
            ) : (
              <Txt size={11} color={colors.muted} style={{ textAlign: 'center', marginTop: 10, lineHeight: 16 }}>
                {Platform.OS === 'web'
                  ? 'Compartilhar abre o menu do navegador, quando ele permite.'
                  : 'Compartilhar e Imprimir abrem o menu do aparelho (Salvar em Arquivos, WhatsApp, E-mail, Imprimir…).'}
              </Txt>
            )}
          </View>
        ) : null}
      </Screen>
    </>
  );
}

function BreakdownRow({ name, color, value }: { name: string; color: string; value: number }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
      <Row style={{ gap: 8, flex: 1 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
        <Txt weight="medium" size={13} numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Txt>
      </Row>
      <Txt mono size={13} color={colors.muted}>{formatBRL(value)}</Txt>
    </Row>
  );
}
