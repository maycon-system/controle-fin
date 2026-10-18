import { pdfFileName } from '../pdfFileName';

describe('pdfFileName', () => {
  it.each([
    ['Relatório — Outubro 2026', 'relatorio-outubro-2026.pdf'],
    ['Relatório — Outubro a Dezembro 2026', 'relatorio-outubro-a-dezembro-2026.pdf'],
    ['Relatório anual 2026', 'relatorio-anual-2026.pdf'],
    ['Relatório — Março 2027', 'relatorio-marco-2027.pdf'],
  ])('%s → %s', (title, expected) => {
    expect(pdfFileName(title)).toBe(expected);
  });

  it('título vazio cai no nome padrão', () => {
    expect(pdfFileName('')).toBe('relatorio-controle-fin.pdf');
    expect(pdfFileName('!!!')).toBe('relatorio-controle-fin.pdf');
  });
});
