import { computeOccurrences } from '../occurrences';
import { Entry, Recurrence, Override } from '../types';

const fixed: Recurrence = {
  id: 'r1', groupId: 'nb', description: 'Tim', kind: 'fixed',
  amountCents: 6499, totalCents: 0, startMonth: '2026-05',
  installments: 0, firstInstallment: 1,
};

const parc: Recurrence = {
  id: 'r2', groupId: 'nb', description: 'Curso', kind: 'installment',
  amountCents: 0, totalCents: 168000, startMonth: '2026-10',
  installments: 12, firstInstallment: 1,
};

describe('computeOccurrences', () => {
  it('inclui lançamentos variáveis só do mês pedido', () => {
    const entries: Entry[] = [
      { id: 'e1', groupId: 'pix', description: 'Padaria', amountCents: 2150, month: '2026-10' },
      { id: 'e2', groupId: 'pix', description: 'Padaria', amountCents: 700, month: '2026-09' },
    ];
    const occ = computeOccurrences('2026-10', entries, [], []);
    expect(occ).toHaveLength(1);
    expect(occ[0].amountCents).toBe(2150);
    expect(occ[0].kind).toBe('variable');
  });

  it('parcelado leva o valor da compra e a data de inserção em todas as parcelas', () => {
    const rec = { ...parc, insertedOn: '2026-10-08' };
    for (const month of ['2026-10', '2026-11', '2027-09']) {
      const [o] = computeOccurrences(month, [], [rec], []);
      expect(o.totalCents).toBe(168000);
      expect(o.insertedOn).toBe('2026-10-08');
    }
  });

  it('lançamento variável leva a data de inserção; item sem data não quebra', () => {
    const entries: Entry[] = [
      { id: 'e1', groupId: 'pix', description: 'Padaria', amountCents: 2150, month: '2026-10', insertedOn: '2026-10-16' },
      { id: 'e2', groupId: 'pix', description: 'Antigo', amountCents: 700, month: '2026-10' },
    ];
    const occ = computeOccurrences('2026-10', entries, [], []);
    expect(occ.map((o) => o.insertedOn)).toEqual(['2026-10-16', undefined]);
  });

  it('fixo vale do início em diante, e não antes', () => {
    expect(computeOccurrences('2026-04', [], [fixed], [])).toHaveLength(0);
    expect(computeOccurrences('2026-05', [], [fixed], [])).toHaveLength(1);
    expect(computeOccurrences('2028-01', [], [fixed], [])).toHaveLength(1);
  });

  it('fixo encerrado não aparece depois do endMonth', () => {
    const ended = { ...fixed, endMonth: '2026-08' };
    expect(computeOccurrences('2026-08', [], [ended], [])).toHaveLength(1);
    expect(computeOccurrences('2026-09', [], [ended], [])).toHaveLength(0);
  });

  it('parcelado avança a parcela a cada mês e para no fim', () => {
    const out = computeOccurrences('2026-12', [], [parc], []);
    expect(out[0].installment).toEqual({ current: 3, total: 12 });
    expect(out[0].amountCents).toBe(14000);
    expect(computeOccurrences('2027-09', [], [parc], [])).toHaveLength(1);
    expect(computeOccurrences('2027-10', [], [parc], [])).toHaveLength(0);
  });

  it('parcelado começando na parcela 4', () => {
    const r = { ...parc, firstInstallment: 4, installments: 6, totalCents: 3000 };
    const out = computeOccurrences('2026-12', [], [r], []);
    expect(out[0].installment).toEqual({ current: 6, total: 6 });
    expect(computeOccurrences('2027-01', [], [r], [])).toHaveLength(0);
  });

  it('exceção troca o valor só naquele mês', () => {
    const ov: Override[] = [{ recurrenceId: 'r1', month: '2026-06', amountCents: 7052, skipped: false }];
    const jun = computeOccurrences('2026-06', [], [fixed], ov);
    const jul = computeOccurrences('2026-07', [], [fixed], ov);
    expect(jun[0].amountCents).toBe(7052);
    expect(jun[0].overridden).toBe(true);
    expect(jul[0].amountCents).toBe(6499);
    expect(jul[0].overridden).toBe(false);
  });

  it('exceção com skipped remove a ocorrência do mês', () => {
    const ov: Override[] = [{ recurrenceId: 'r1', month: '2026-06', skipped: true }];
    expect(computeOccurrences('2026-06', [], [fixed], ov)).toHaveLength(0);
    expect(computeOccurrences('2026-07', [], [fixed], ov)).toHaveLength(1);
  });
});
