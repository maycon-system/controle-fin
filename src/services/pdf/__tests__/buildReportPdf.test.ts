import { buildReportPdf } from '../buildReportPdf';
import type { ReportPdfInput } from '../types';

const AT = new Date(2026, 9, 18, 10, 5, 0);

/** Os bytes do PDF como texto latin1 (cada byte vira um caractere), igual ao que o arquivo contém. */
const read = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

const month = (label: string, monthName: string, income: number, spent: number) => ({
  label, monthName, incomeCents: income, spentCents: spent, balanceCents: income - spent,
});

const base: ReportPdfInput = {
  title: 'Relatório — Outubro 2026',
  subtitle: 'Mês completo',
  period: 'Outubro 2026',
  incomeCents: 600000,
  spentCents: 29000,
  balanceCents: 571000,
  averageCents: 29000,
  groups: [
    { name: 'Nubank', cents: 14000, color: '#7c3aed' },
    { name: 'PIX', cents: 15000, color: '#00b87a' },
  ],
  categories: [{ name: 'Farmácia', cents: 5000, color: '#dc2626' }],
  months: [month('Outubro 2026', 'Outubro', 600000, 29000)],
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function checkStructure(pdf: string) {
  expect(pdf.startsWith('%PDF-1.4')).toBe(true);
  expect(pdf.endsWith('%%EOF')).toBe(true);

  const start = /startxref\n(\d+)\n%%EOF$/.exec(pdf);
  expect(start).not.toBeNull();
  const xrefAt = Number(start![1]);
  expect(pdf.slice(xrefAt).startsWith('xref\n')).toBe(true);

  const head = /^xref\n0 (\d+)\n/.exec(pdf.slice(xrefAt));
  expect(head).not.toBeNull();
  const count = Number(head![1]);
  const entries = pdf
    .slice(xrefAt + head![0].length)
    .split('\n')
    .slice(0, count);
  expect(entries[0]).toBe('0000000000 65535 f ');
  for (let i = 1; i < count; i++) {
    const offset = Number(entries[i].slice(0, 10));
    expect(pdf.slice(offset).startsWith(`${i} 0 obj`)).toBe(true); // cada objeto está onde a tabela diz
  }

  const pages = (pdf.match(/\/Type \/Page \/Parent/g) ?? []).length;
  expect(pdf).toContain(`/Count ${pages}`);
  return pages;
}

describe('buildReportPdf', () => {
  it('gera um PDF estruturalmente válido', () => {
    const pages = checkStructure(read(buildReportPdf(base, AT)));
    expect(pages).toBe(1);
  });

  it('relatório mensal pequeno: 1 página com título, totais, grupos, categorias e rodapé', () => {
    const pdf = read(buildReportPdf(base, AT));
    for (const t of [
      'RELATÓRIO FINANCEIRO', '(Outubro 2026)', '(Mês completo)', 'Controle.fin',
      '(R$ 6.000,00)', '(R$ 290,00)', '(R$ 5.710,00)', 'Nubank', 'PIX', 'Farmácia', 'Página 1/1',
    ]) {
      expect(pdf).toContain(t);
    }
    expect(pdf).toMatch(/Gerado em 18\/10\/2026 .* · Página 1\/1/);
  });

  it('acentos saem em WinAnsi, sem virar "?"', () => {
    const pdf = read(
      buildReportPdf({ ...base, categories: [{ name: 'Farmácia Fórmula', cents: 5000, color: '#dc2626' }] }, AT),
    );
    expect(pdf).toContain('(Farmácia Fórmula');
    expect(pdf).not.toContain('Farm?cia');
  });

  it('escapa parênteses e barra invertida nos nomes', () => {
    const pdf = read(
      buildReportPdf({ ...base, categories: [{ name: 'Loja (Centro) \\ A', cents: 5000, color: '#dc2626' }] }, AT),
    );
    expect(pdf).toContain('Loja \\(Centro\\) \\\\ A');
  });

  it('caracteres fora do Latin-1 viram "?" (limitação documentada)', () => {
    const pdf = read(
      buildReportPdf({ ...base, categories: [{ name: 'Café ☕', cents: 5000, color: '#dc2626' }] }, AT),
    );
    expect(pdf).toContain('(Café ?');
  });

  it('muitas categorias geram várias páginas, com rodapé consistente', () => {
    const categories = Array.from({ length: 80 }, (_, i) => ({
      name: `Categoria ${String(i + 1).padStart(2, '0')}`, cents: 1000 + i, color: '#2563eb',
    }));
    const pdf = read(buildReportPdf({ ...base, categories, spentCents: 200000 }, AT));
    const pages = checkStructure(pdf);
    expect(pages).toBeGreaterThan(1);
    for (let i = 1; i <= pages; i++) expect(pdf).toContain(`Página ${i}/${pages}`);
    expect(pdf).toContain('Categoria 80');
  });

  it('anual: detalhamento mensal com uma linha por mês e saldo negativo com sinal', () => {
    const months = MONTH_NAMES.map((n, i) =>
      month(`${n} 2026`, n, 600000, i === 2 ? 650000 : 100000),
    );
    const pdf = read(buildReportPdf({
      ...base, title: 'Relatório anual 2026', subtitle: 'Janeiro a Dezembro', period: 'Ano de 2026',
      incomeCents: 7200000, spentCents: 1750000, balanceCents: 5450000, averageCents: 145833, months,
    }, AT));
    checkStructure(pdf);
    expect(pdf).toContain('DETALHAMENTO MENSAL');
    for (const n of MONTH_NAMES) expect(pdf).toContain(`(${n} 2026)`);
    expect(pdf).toContain('(-500,00)'); // março: 6.000 - 6.500
  });

  it('período sem gastos continua válido e avisa', () => {
    const pdf = read(buildReportPdf({
      ...base, spentCents: 0, balanceCents: 600000, averageCents: 0, groups: [], categories: [],
      months: [month('Outubro 2026', 'Outubro', 600000, 0)],
    }, AT));
    checkStructure(pdf);
    expect(pdf).toContain('Nenhum gasto no período');
    expect(pdf).toContain('Nenhum gasto categorizado no período.');
  });

  it('nunca escreve NaN, undefined ou Infinity (renda zero, gasto zero, sem meses)', () => {
    const empty: ReportPdfInput = {
      ...base, incomeCents: 0, spentCents: 0, balanceCents: 0, averageCents: 0,
      groups: [], categories: [], months: [],
    };
    const cases: ReportPdfInput[] = [
      empty,
      { ...empty, months: [month('Outubro 2026', 'Outubro', 0, 0)] },
      { ...base, incomeCents: 0, balanceCents: -29000 },
      { ...base, months: [month('Outubro 2026', 'Outubro', 0, 0), month('Novembro 2026', 'Novembro', 0, 0)] },
    ];
    for (const c of cases) {
      const pdf = read(buildReportPdf(c, AT));
      checkStructure(pdf);
      expect(pdf).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('é determinístico: mesma entrada e mesma data geram os mesmos bytes', () => {
    const a = buildReportPdf(base, AT);
    const b = buildReportPdf(base, AT);
    expect(Buffer.compare(Buffer.from(a), Buffer.from(b))).toBe(0);
  });

  it('"Sem categoria" é a diferença entre o gasto e a soma das categorias', () => {
    const pdf = read(buildReportPdf(base, AT)); // gasto 290,00 e categorias 50,00
    expect(pdf).toContain('Sem categoria');
    expect(pdf).toContain('(240,00)');
  });

  it('sem diferença, não mostra "Sem categoria"', () => {
    const pdf = read(buildReportPdf({
      ...base, categories: [{ name: 'Tudo', cents: 29000, color: '#dc2626' }],
    }, AT));
    expect(pdf).not.toContain('Sem categoria');
  });

  it('devolve bytes (Uint8Array), nunca Blob', () => {
    const out = buildReportPdf(base, AT);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(1000);
  });
});
