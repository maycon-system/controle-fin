import type { ReportData } from '../../../data/reports';
import type { Period } from '../../../domain/reportPeriod';
import { NEED_REPORT_MSG, runPdfAction, visibleActions } from '../run';
import type { PdfActions } from '../share.types';

const period: Period = {
  months: ['2026-10'],
  title: 'Relatório — Outubro 2026',
  subtitle: 'Mês completo',
  label: 'Outubro 2026',
};

const data: ReportData = {
  groups: [{ id: 'g1', name: 'Nubank', color: '#7c3aed', sortOrder: 0, isPix: false }],
  categories: [],
  report: {
    incomeCents: 600000, spentCents: 14000, balanceCents: 586000, averageSpentCents: 14000,
    byGroup: { g1: 14000 }, byCategory: { none: 14000 },
    perMonth: [{ month: '2026-10', incomeCents: 600000, spentCents: 14000, balanceCents: 586000 }],
  },
};

function fakeActions(overrides: Partial<PdfActions> = {}) {
  const calls: { id: string; bytes: Uint8Array; fileName?: string }[] = [];
  const actions: PdfActions = {
    share: async (bytes, fileName) => { calls.push({ id: 'share', bytes, fileName }); return null; },
    print: async (bytes, fileName) => { calls.push({ id: 'print', bytes, fileName }); return null; },
    ...overrides,
  };
  return { actions, calls };
}

const head = (b: Uint8Array) => Buffer.from(b.slice(0, 8)).toString('latin1');

describe('visibleActions', () => {
  it('web tem os quatro botões', () => {
    expect(visibleActions('web')).toEqual(['share', 'open', 'download', 'print']);
  });

  it('iPhone e Android: compartilhar e imprimir', () => {
    expect(visibleActions('ios')).toEqual(['share', 'print']);
    expect(visibleActions('android')).toEqual(['share', 'print']);
  });
});

describe('runPdfAction', () => {
  it('sem relatório gerado, pede para gerar primeiro e não chama nada', async () => {
    const { actions, calls } = fakeActions();
    expect(await runPdfAction('share', null, actions)).toBe(NEED_REPORT_MSG);
    expect(calls).toEqual([]);
  });

  it('compartilhar: gera um PDF válido com o nome do período', async () => {
    const { actions, calls } = fakeActions();
    const msg = await runPdfAction('share', { period, data }, actions);
    expect(msg).toBeNull();
    expect(calls).toHaveLength(1);
    expect(head(calls[0].bytes)).toBe('%PDF-1.4');
    expect(calls[0].fileName).toBe('relatorio-outubro-2026.pdf');
  });

  it('imprimir chama print', async () => {
    const { actions, calls } = fakeActions();
    await runPdfAction('print', { period, data }, actions);
    expect(calls.map((c) => c.id)).toEqual(['print']);
  });

  it('abrir e baixar usam as funções da web quando existem', async () => {
    const seen: string[] = [];
    const { actions } = fakeActions({
      open: () => { seen.push('open'); return null; },
      download: (_b, name) => { seen.push('download:' + name); return null; },
    });
    await runPdfAction('open', { period, data }, actions);
    await runPdfAction('download', { period, data }, actions);
    expect(seen).toEqual(['open', 'download:relatorio-outubro-2026.pdf']);
  });

  it('abrir/baixar sem suporte devolvem um aviso', async () => {
    const { actions } = fakeActions(); // sem open nem download
    expect(await runPdfAction('open', { period, data }, actions)).toContain('não está disponível');
    expect(await runPdfAction('download', { period, data }, actions)).toContain('não está disponível');
  });

  it('repassa a mensagem devolvida pela ação', async () => {
    const { actions } = fakeActions({ share: async () => 'Este navegador não compartilha arquivos.' });
    expect(await runPdfAction('share', { period, data }, actions)).toBe('Este navegador não compartilha arquivos.');
  });

  it('erro numa ação vira mensagem em português, sem estourar', async () => {
    const { actions } = fakeActions({
      print: async () => { throw new Error('sem impressora'); },
    });
    const msg = await runPdfAction('print', { period, data }, actions);
    expect(msg).toContain('Não foi possível');
    expect(msg).toContain('sem impressora');
  });

  it('a ação é chamada de forma síncrona (exigência do navegador para compartilhar)', () => {
    let called = false;
    const { actions } = fakeActions({
      share: async () => { called = true; return null; },
    });
    void runPdfAction('share', { period, data }, actions);
    expect(called).toBe(true); // sem nenhum await antes da chamada
  });
});
