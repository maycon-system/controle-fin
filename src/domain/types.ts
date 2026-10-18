import { Cents } from './money';
import { YearMonth } from './month';

export interface Entry {
  id: string;
  groupId: string;
  categoryId?: string | null;
  description: string;
  amountCents: Cents;
  month: YearMonth;
}

export interface Recurrence {
  id: string;
  groupId: string;
  categoryId?: string | null;
  description: string;
  kind: 'fixed' | 'installment';
  amountCents: Cents; // valor mensal, usado quando kind = 'fixed'
  totalCents: Cents; // valor da compra, usado quando kind = 'installment'
  startMonth: YearMonth;
  endMonth?: YearMonth | null; // último mês em que a regra vale (inclusive)
  installments: number; // total de parcelas (installment)
  firstInstallment: number; // parcela em que startMonth cai (installment)
  dueDay?: number | null;
}

export interface Override {
  recurrenceId: string;
  month: YearMonth;
  amountCents?: Cents | null;
  skipped: boolean;
}

export interface Occurrence {
  key: string;
  source: 'entry' | 'recurrence';
  sourceId: string;
  groupId: string;
  categoryId: string | null;
  description: string;
  amountCents: Cents;
  kind: 'variable' | 'fixed' | 'installment';
  installment?: { current: number; total: number };
  dueDay?: number | null;
  overridden: boolean;
}
