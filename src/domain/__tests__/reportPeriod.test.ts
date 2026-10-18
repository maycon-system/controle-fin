import { buildPeriod } from '../reportPeriod';

describe('buildPeriod', () => {
  it('mensal', () => {
    const r = buildPeriod({ kind: 'mensal', year: 2026, monthFrom: 9, monthTo: 9 });
    expect(r).toEqual({
      ok: true,
      period: {
        months: ['2026-10'],
        title: 'Relatório — Outubro 2026',
        subtitle: 'Mês completo',
        label: 'Outubro 2026',
      },
    });
  });

  it('período dentro do ano', () => {
    const r = buildPeriod({ kind: 'periodo', year: 2026, monthFrom: 9, monthTo: 11 });
    expect(r.ok && r.period.months).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(r.ok && r.period.title).toBe('Relatório — Outubro a Dezembro 2026');
    expect(r.ok && r.period.subtitle).toBe('3 meses');
    expect(r.ok && r.period.label).toBe('Outubro a Dezembro 2026');
  });

  it('um período de um mês só usa o singular', () => {
    const r = buildPeriod({ kind: 'periodo', year: 2026, monthFrom: 4, monthTo: 4 });
    expect(r.ok && r.period.subtitle).toBe('1 mês');
  });

  it('anual', () => {
    const r = buildPeriod({ kind: 'anual', year: 2026, monthFrom: 0, monthTo: 0 });
    expect(r.ok && r.period.months).toHaveLength(12);
    expect(r.ok && r.period.months[0]).toBe('2026-01');
    expect(r.ok && r.period.months[11]).toBe('2026-12');
    expect(r.ok && r.period.title).toBe('Relatório anual 2026');
    expect(r.ok && r.period.label).toBe('Ano de 2026');
  });

  it('mês final antes do inicial é erro com mensagem', () => {
    const r = buildPeriod({ kind: 'periodo', year: 2026, monthFrom: 9, monthTo: 3 });
    expect(r).toEqual({ ok: false, error: 'O mês final não pode ser antes do mês inicial.' });
  });
});
