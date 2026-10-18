export interface PdfGroup {
  name: string;
  cents: number;
  /** '#rrggbb' */
  color: string;
}

export interface PdfCategory {
  name: string;
  cents: number;
  color: string;
}

export interface PdfMonth {
  /** "Outubro 2026" */
  label: string;
  /** "Outubro" */
  monthName: string;
  incomeCents: number;
  spentCents: number;
  balanceCents: number;
}

export interface ReportPdfInput {
  /** "Relatório — Outubro 2026" (usado no nome do arquivo) */
  title: string;
  /** "Mês completo", "3 meses"… */
  subtitle: string;
  /** "Outubro 2026" (grande, no cabeçalho) */
  period: string;
  incomeCents: number;
  spentCents: number;
  balanceCents: number;
  averageCents: number;
  groups: PdfGroup[];
  /** Só as categorias com nome; "Sem categoria" é calculada (gasto menos a soma delas). */
  categories: PdfCategory[];
  months: PdfMonth[];
}
