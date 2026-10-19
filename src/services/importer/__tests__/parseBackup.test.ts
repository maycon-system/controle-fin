import { computeOccurrences } from '../../../domain/occurrences';
import { parseBackup } from '../parseBackup';
import { makeBackup } from './fixture';

let n = 0;
const newId = () => `id-${++n}`;
const plan = () => {
  n = 0;
  return parseBackup(makeBackup(), newId);
};

describe('parseBackup', () => {
  it('recusa arquivo que não é um backup', () => {
    expect(() => parseBackup({}, newId)).toThrow('não parece um backup');
    expect(() => parseBackup(null, newId)).toThrow('não parece um backup');
    expect(() => parseBackup({ dados: 'x' }, newId)).toThrow('não parece um backup');
  });

  it('grupos e categorias vêm do backup, com o PIX marcado e ids novos', () => {
    const p = plan();
    expect(p.groups.map((g) => [g.name, g.color, g.sortOrder, g.isPix])).toEqual([
      ['Nubank', '#7c3aed', 0, false],
      ['PIX', '#00b87a', 1, true],
      ['Fixo', '#d97706', 2, false],
    ]);
    expect(p.categories.map((c) => c.name)).toEqual(['Farmácia', 'Assinaturas']);
    expect(new Set([...p.groups, ...p.categories].map((x) => x.id)).size).toBe(5); // ids únicos e novos
    expect(p.groups[0].id).toMatch(/^id-/);
  });

  it('sem lista de grupos no backup, usa os grupos padrão do app antigo', () => {
    const b = makeBackup();
    delete b.dados.cfin_grupos;
    const p = parseBackup(b, newId);
    expect(p.groups.map((g) => g.name)).toEqual(['Pessoal NB', 'PIX', 'Fixo']);
  });

  it('lançamentos variáveis: mês convertido, valor em centavos e data do lançamento', () => {
    const p = plan();
    const byDesc = (d: string) => p.entries.find((e) => e.description === d)!;
    expect(byDesc('Banho')).toMatchObject({ amountCents: 33125, month: '2026-05', occurredOn: '2026-05-06' });
    expect(byDesc('Com data')).toMatchObject({ amountCents: 2000, month: '2026-10', occurredOn: '2026-10-08' });
    expect(byDesc('Sem data')).toMatchObject({ amountCents: 1000, month: '2026-10', occurredOn: '2026-10-01' });
    const farm = p.categories.find((c) => c.name === 'Farmácia')!;
    expect(byDesc('Banho').categoryId).toBe(farm.id);
    expect(byDesc('Sem data').categoryId).toBeNull();
  });

  it('as 36 cópias de um fixo viram UMA regra, com a última versão como valor', () => {
    const p = plan();
    const nu = p.recurrences.filter((r) => r.description === 'NuVida');
    expect(nu).toHaveLength(1);
    expect(nu[0]).toMatchObject({
      kind: 'fixed', amountCents: 1716, startMonth: '2026-05', endMonth: null, dueDay: 12,
    });
  });

  it('valor diferente num mês vira exceção; mês ausente vira "pulado"', () => {
    const p = plan();
    const nu = p.recurrences.find((r) => r.description === 'NuVida')!;
    const ov = p.overrides.filter((o) => o.recurrenceId === nu.id).sort((a, b) => a.month.localeCompare(b.month));
    expect(ov).toEqual([
      { recurrenceId: nu.id, month: '2026-06', amountCents: 1999, skipped: false },
      { recurrenceId: nu.id, month: '2026-07', amountCents: null, skipped: true },
    ]);
  });

  it('"sourceId" igual em grupos diferentes são recorrências diferentes', () => {
    const p = plan();
    expect(p.recurrences.filter((r) => r.description === 'MEI')).toHaveLength(1);
    expect(p.recurrences.filter((r) => r.description === 'NuVida')).toHaveLength(1);
  });

  it('fixo que parou antes do mês atual do backup é encerrado', () => {
    const p = plan();
    const r = p.recurrences.find((x) => x.description === 'Antiga')!;
    expect(r.endMonth).toBe('2026-07');
    expect(p.recurrences.find((x) => x.description === 'MEI')!.endMonth).toBeNull(); // chegou até outubro
  });

  it('parcelado: total, parcela inicial e quantidade vêm da cadeia', () => {
    const p = plan();
    const curso = p.recurrences.find((r) => r.description === 'Curso')!;
    expect(curso).toMatchObject({
      kind: 'installment', totalCents: 168000, installments: 12, firstInstallment: 1, startMonth: '2026-10', endMonth: null,
    });
  });

  it('parcelado antigo sem valorTotal: total = parcela × nº de parcelas', () => {
    const p = plan();
    const d = p.recurrences.find((r) => r.description === 'Diego')!;
    expect(d).toMatchObject({ totalCents: 45672, installments: 3, startMonth: '2026-07', endMonth: null });
    expect(p.overrides.filter((o) => o.recurrenceId === d.id)).toEqual([]); // 152,24 em cada parcela, sem exceção
  });

  it('parcelado cancelado no meio é encerrado no último mês existente', () => {
    const p = plan();
    expect(p.recurrences.find((r) => r.description === 'Cancelado')!.endMonth).toBe('2026-06');
  });

  it('saldo bancário: histórico por mês, na ordem, com ajuste quando não fecha', () => {
    const p = plan();
    const oct = p.bankEntries.filter((b) => b.month === '2026-10');
    expect(oct.map((b) => [b.kind, b.amountCents])).toEqual([['set', 19294], ['set', 108440], ['add', 90000]]);
    expect(oct.map((b) => b.at)).toEqual([...oct.map((b) => b.at)].sort()); // ordem preservada
    const may = p.bankEntries.filter((b) => b.month === '2026-05');
    expect(may.map((b) => [b.kind, b.amountCents])).toEqual([['set', 150000], ['set', 200000]]);
    expect(p.warnings.some((w) => w.includes('2026-05') && w.toLowerCase().includes('saldo'))).toBe(true);
  });

  it('renda por mês; a renda padrão global é ignorada', () => {
    const p = plan();
    expect(p.income).toEqual(
      expect.arrayContaining([
        { month: '2026-05', amountCents: 450000 },
        { month: '2026-10', amountCents: 600000 },
      ]),
    );
    expect(p.income).toHaveLength(2);
  });

  it('grupos antigos que não aparecem no app são ignorados, com aviso', () => {
    const p = plan();
    expect(p.entries.some((e) => e.description.startsWith('Antigo'))).toBe(false);
    expect(p.warnings.some((w) => w.includes('2 itens') && w.includes('cartao') && w.includes('comum'))).toBe(true);
  });

  it('o resultado reproduz, mês a mês, o total que o app antigo mostrava', () => {
    const p = plan();
    const b = makeBackup().dados as Record<string, { value: number }[]>;
    const groupIds = new Map(p.groups.map((g) => [g.name, g.id]));
    const keyToGroup: Record<string, string> = { nb: 'Nubank', pix: 'PIX', fixo: 'Fixo' };
    // total esperado por (grupo, mês), somando o que o app antigo guardou
    const expected: Record<string, number> = {};
    for (const [k, v] of Object.entries(b)) {
      const m = /^cfin_(nb|pix|fixo)_(\d+)_(\d{4})$/.exec(k);
      if (!m || !Array.isArray(v)) continue;
      const month = `${m[3]}-${String(Number(m[2]) + 1).padStart(2, '0')}`;
      const key = `${groupIds.get(keyToGroup[m[1]])}|${month}`;
      expected[key] = (expected[key] ?? 0) + v.reduce((s, i) => s + Math.round(i.value * 100), 0);
    }
    const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    for (const month of months) {
      const occ = computeOccurrences(
        month,
        p.entries,
        p.recurrences,
        p.overrides,
      );
      const got: Record<string, number> = {};
      for (const o of occ) got[`${o.groupId}|${month}`] = (got[`${o.groupId}|${month}`] ?? 0) + o.amountCents;
      for (const [key, total] of Object.entries(expected)) {
        if (key.endsWith(month)) expect(got[key] ?? 0).toBe(total);
      }
    }
  });
});
