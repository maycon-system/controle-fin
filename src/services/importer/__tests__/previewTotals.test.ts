import { parseBackup } from '../parseBackup';
import { previewTotals } from '../previewTotals';
import { makeBackup } from './fixture';

const plan = () => {
  let n = 0;
  return parseBackup(makeBackup(), () => `id-${++n}`);
};

describe('previewTotals', () => {
  it('lista o gasto de cada mês, do primeiro dado até o último mês com renda ou lançamento', () => {
    const t = previewTotals(plan());
    expect(t.map((x) => x.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  });

  it('o total do mês inclui lançamentos, fixos, parcelas e exceções', () => {
    const t = Object.fromEntries(previewTotals(plan()).map((x) => [x.month, x.spentCents]));
    // julho: NuVida pulado + Diego 152,24 + MEI 86,05 + Antiga 30,00
    expect(t['2026-07']).toBe(15224 + 8605 + 3000);
    // junho: NuVida ajustado para 19,99 + MEI 86,05 + Antiga 30,00 + Cancelado 50,00
    expect(t['2026-06']).toBe(1999 + 8605 + 3000 + 5000);
  });

  it('sem dados, devolve lista vazia', () => {
    const empty = plan();
    empty.entries = [];
    empty.recurrences = [];
    empty.overrides = [];
    empty.income = [];
    expect(previewTotals(empty)).toEqual([]);
  });
});
