import { useState } from 'react';
import { View } from 'react-native';

import type { Category } from '../../data/repos/categories';
import type { Group } from '../../data/repos/groups';
import { formatBRL } from '../../domain/money';
import { MONTHS_FULL, monthLabel, rangeOfMonths, type YearMonth } from '../../domain/month';
import { computeOccurrences } from '../../domain/occurrences';
import { buildReport, type Report } from '../../domain/report';
import { useRepos } from '../../ui/context';
import { MonthHeader } from '../../ui/MonthHeader';
import { Button, Card, ChipRow, Row, Screen, SectionTitle, Txt } from '../../ui/primitives';
import { colors } from '../../ui/theme';

type Kind = 'mensal' | 'periodo' | 'anual';

interface Result {
  title: string;
  subtitle: string;
  report: Report;
  groups: Group[];
  categories: Category[];
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

  const monthOptions = MONTHS_FULL.map((n, i) => ({ value: String(i), label: n.slice(0, 3) }));
  const yearOptions = Array.from({ length: thisYear + 2 - 2025 + 1 }, (_, i) => String(2025 + i)).map((y) => ({
    value: y,
    label: y,
  }));

  async function generate() {
    setError('');
    const y = Number(year);
    let first: YearMonth;
    let last: YearMonth;
    let title: string;
    let subtitle: string;
    const ym = (month: string): YearMonth => `${y}-${String(Number(month) + 1).padStart(2, '0')}`;

    if (kind === 'mensal') {
      first = last = ym(m1);
      title = `Relatório — ${monthLabel(first, true)}`;
      subtitle = 'Mês completo';
    } else if (kind === 'periodo') {
      first = ym(m1);
      last = ym(m2);
      if (Number(m2) < Number(m1)) return setError('O mês final não pode ser antes do mês inicial.');
      title = `Relatório — ${MONTHS_FULL[Number(m1)]} a ${MONTHS_FULL[Number(m2)]} ${y}`;
      subtitle = `${rangeOfMonths(first, last).length} meses`;
    } else {
      first = `${y}-01`;
      last = `${y}-12`;
      title = `Relatório anual ${y}`;
      subtitle = 'Janeiro a Dezembro';
    }

    const months = rangeOfMonths(first, last);
    const [entries, recurrences, overrides, groups, categories] = await Promise.all([
      repos.entries.listBetween(first, last),
      repos.recurrences.list(),
      repos.overrides.list(),
      repos.groups.list(),
      repos.categories.list(),
    ]);
    const occurrencesByMonth: Record<string, ReturnType<typeof computeOccurrences>> = {};
    const incomeByMonth: Record<string, number> = {};
    for (const m of months) {
      occurrencesByMonth[m] = computeOccurrences(m, entries, recurrences, overrides);
      incomeByMonth[m] = await repos.income.forMonth(m);
    }
    setResult({
      title,
      subtitle,
      report: buildReport({ months, occurrencesByMonth, incomeByMonth }),
      groups,
      categories,
    });
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
              <Txt weight="bold" color="#fff">{result.title}</Txt>
              <Txt size={11} color="rgba(255,255,255,0.55)">{result.subtitle}</Txt>
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
