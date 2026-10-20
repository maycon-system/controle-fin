import { installmentAmount } from '../../domain/installments';
import { toCents } from '../../domain/money';
import { monthOf, monthsBetween, rangeOfMonths, type YearMonth } from '../../domain/month';
import type { Override, Recurrence } from '../../domain/types';

// ── Resultado da leitura do backup do app antigo ─────────────────────────────
export interface ImportGroup { id: string; name: string; color: string; sortOrder: number; isPix: boolean }
export interface ImportCategory { id: string; name: string; color: string }
export interface ImportEntry {
  id: string; groupId: string; categoryId: string | null; description: string;
  amountCents: number; month: YearMonth; occurredOn: string;
}
export interface ImportIncome { month: YearMonth; amountCents: number }
export interface ImportBankEntry { id: string; month: YearMonth; kind: 'add' | 'set'; amountCents: number; at: string }

export interface ImportPlan {
  groups: ImportGroup[];
  categories: ImportCategory[];
  entries: ImportEntry[];
  recurrences: Recurrence[];
  overrides: Override[];
  income: ImportIncome[];
  bankEntries: ImportBankEntry[];
  warnings: string[];
}

interface RawItem {
  id: number; desc?: string; value: number; rec?: string; cat?: string; sourceId?: number;
  diaVenc?: number; dataLanc?: string; totalParc?: number; parcAtual?: number; valorTotal?: number;
}
interface Member { month: YearMonth; item: RawItem }

const DEFAULT_GROUPS = [
  { id: 'nb', nome: 'Pessoal NB', cor: '#2563eb' },
  { id: 'pix', nome: 'PIX', cor: '#00b87a' },
  { id: 'fixo', nome: 'Fixo', cor: '#d97706' },
];
const DEFAULT_CATS = [
  { id: 'farm', nome: 'Farmácia', cor: '#dc2626' },
  { id: 'merca', nome: 'Mercado', cor: '#00b87a' },
  { id: 'assin', nome: 'Assinaturas', cor: '#7c3aed' },
  { id: 'transp', nome: 'Transporte', cor: '#d97706' },
  { id: 'lazer', nome: 'Lazer', cor: '#0891b2' },
  { id: 'saude', nome: 'Saúde', cor: '#db2777' },
  { id: 'outros', nome: 'Outros', cor: '#8a93a8' },
];
const RESERVED = new Set(['banco', 'bhist', 'renda']);
const pad = (n: number) => String(n).padStart(2, '0');
const ymOf = (monthIdx0: number, year: number): YearMonth => `${year}-${pad(monthIdx0 + 1)}`;

const localDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Data do lançamento: dataLanc, ou o id (que era Date.now()) quando plausível, ou o dia 1 do mês. */
function occurredOn(item: RawItem, month: YearMonth): string {
  if (item.dataLanc && !Number.isNaN(Date.parse(item.dataLanc))) return localDate(Date.parse(item.dataLanc));
  const id = Math.floor(Number(item.id));
  if (id > Date.UTC(2025, 0, 1) && id < Date.UTC(2035, 0, 1)) return localDate(id);
  return `${month}-01`;
}

/**
 * Lê o backup JSON do app antigo (versão 3.0) e monta o que vai para o app novo.
 * Função pura: os ids novos vêm de `newId`.
 */
export function parseBackup(json: unknown, newId: () => string): ImportPlan {
  const root = json as { data?: string; dados?: Record<string, unknown> } | null;
  if (!root || typeof root !== 'object' || !root.dados || typeof root.dados !== 'object') {
    throw new Error('Arquivo inválido: não parece um backup do Controle.fin.');
  }
  const dados = root.dados;
  const warnings: string[] = [];

  // Grupos e categorias (sem lista salva, valem os padrões do app antigo)
  const rawGroups = (Array.isArray(dados.cfin_grupos) ? dados.cfin_grupos : DEFAULT_GROUPS) as { id: string; nome: string; cor: string }[];
  const rawCats = (Array.isArray(dados.cfin_cats) ? dados.cfin_cats : DEFAULT_CATS) as { id: string; nome: string; cor: string }[];
  const groupId = new Map<string, string>();
  const groups: ImportGroup[] = rawGroups.map((g, i) => {
    const id = newId();
    groupId.set(g.id, id);
    return { id, name: g.nome, color: g.cor, sortOrder: i, isPix: g.id === 'pix' };
  });
  const catId = new Map<string, string>();
  const categories: ImportCategory[] = rawCats.map((c) => {
    const id = newId();
    catId.set(c.id, id);
    return { id, name: c.nome, color: c.cor };
  });

  // Mês atual do app quando o backup foi feito: serve para saber o que foi excluído e o que segue ativo
  const exported = root.data && !Number.isNaN(Date.parse(root.data)) ? monthOf(new Date(root.data)) : null;

  // Itens por grupo e mês
  const entries: ImportEntry[] = [];
  const chains = new Map<string, { gid: string; kind: 'fixo' | 'parcelado'; members: Member[] }>();
  const ignoredGroups = new Map<string, number>();
  let skippedInvalid = 0;
  let maxMonthSeen: YearMonth | null = null;

  for (const [key, value] of Object.entries(dados)) {
    const m = /^cfin_([a-z0-9]+)_(\d{1,2})_(\d{4})$/i.exec(key);
    if (!m || RESERVED.has(m[1]) || !Array.isArray(value)) continue;
    const oldGroup = m[1];
    const month = ymOf(Number(m[2]), Number(m[3]));
    if (!maxMonthSeen || month > maxMonthSeen) maxMonthSeen = month;
    const gid = groupId.get(oldGroup);
    if (!gid) {
      ignoredGroups.set(oldGroup, (ignoredGroups.get(oldGroup) ?? 0) + value.length);
      continue;
    }
    for (const item of value as RawItem[]) {
      const cents = toCents(Number(item.value));
      if (!Number.isFinite(cents) || cents <= 0) { skippedInvalid++; continue; }
      if (item.rec === 'fixo' || item.rec === 'parcelado') {
        const ck = `${oldGroup}:${item.sourceId ?? item.id}`; // sourceId só é único dentro do grupo
        const chain = chains.get(ck) ?? { gid, kind: item.rec, members: [] };
        chain.members.push({ month, item });
        chains.set(ck, chain);
      } else {
        entries.push({
          id: newId(), groupId: gid, categoryId: item.cat ? (catId.get(item.cat) ?? null) : null,
          description: String(item.desc ?? '').trim() || '(sem descrição)', amountCents: cents, month,
          occurredOn: occurredOn(item, month),
        });
      }
    }
  }
  const currentMonth = exported ?? maxMonthSeen;

  // Cada cadeia de cópias vira uma regra + exceções
  const recurrences: Recurrence[] = [];
  const overrides: Override[] = [];
  for (const chain of chains.values()) {
    const byMonth = new Map<YearMonth, RawItem>();
    for (const mem of chain.members) byMonth.set(mem.month, mem.item); // mês repetido: vale o último
    const allMonths = [...byMonth.keys()].sort();
    // O que vale é o que o usuário decidiu até o mês atual do backup. Meses depois dele são cópias que o app
    // antigo gerou sozinho ao abrir aquele mês (com o valor ORIGINAL), então não definem regra nem exceção.
    const upToNow = currentMonth ? allMonths.filter((mo) => mo <= currentMonth) : allMonths;
    const months = upToNow.length > 0 ? upToNow : allMonths; // cadeia que só existe no futuro: usa tudo
    const first = byMonth.get(months[0])!;
    const last = byMonth.get(months[months.length - 1])!;
    const startMonth = months[0];
    const lastMonth = months[months.length - 1]; // último mês decidido
    const lastMonthAny = allMonths[allMonths.length - 1]; // inclui cópias futuras
    const id = newId();
    const base = {
      id, groupId: chain.gid, categoryId: last.cat ? (catId.get(last.cat) ?? null) : null,
      description: String(last.desc ?? '').trim() || '(sem descrição)',
    };

    let expected: (month: YearMonth) => number | null;
    let rec: Recurrence;
    if (chain.kind === 'fixo') {
      const ruleCents = toCents(Number(last.value));
      expected = () => ruleCents;
      rec = {
        ...base, kind: 'fixed', amountCents: ruleCents, totalCents: 0, startMonth, endMonth: null,
        installments: 0, firstInstallment: 1, dueDay: last.diaVenc ?? first.diaVenc ?? null,
        insertedOn: occurredOn(first, startMonth),
      };
      if (currentMonth && lastMonthAny < currentMonth) rec.endMonth = lastMonth; // parou antes do mês atual: foi excluído
    } else {
      const k0 = first.parcAtual ?? 1;
      const n = Math.max(last.totalParc ?? first.totalParc ?? 1, k0, last.parcAtual ?? 1);
      // valorTotal vem em reais; compras antigas guardavam só a parcela (total = parcela × nº de parcelas)
      const declared = first.valorTotal ?? last.valorTotal;
      const totalCents = declared ? toCents(Number(declared)) : toCents(Number(first.value) * n);
      expected = (month) => {
        const k = k0 + monthsBetween(startMonth, month);
        return k >= 1 && k <= n ? installmentAmount(totalCents, n, k) : null;
      };
      rec = {
        ...base, kind: 'installment', amountCents: 0, totalCents, startMonth, endMonth: null,
        installments: n, firstInstallment: k0, dueDay: null,
        insertedOn: occurredOn(first, startMonth),
      };
      const lastAny = byMonth.get(lastMonthAny)!;
      const lastK = lastAny.parcAtual ?? k0 + monthsBetween(startMonth, lastMonthAny);
      if (currentMonth && lastMonthAny < currentMonth && lastK < n) rec.endMonth = lastMonth; // cancelado no meio
      for (const month of months) {
        const k = byMonth.get(month)!.parcAtual;
        if (k !== undefined && k !== k0 + monthsBetween(startMonth, month)) {
          warnings.push(`"${base.description}" (${month}): a parcela ${k} não bate com a sequência esperada; valor mantido.`);
          break;
        }
      }
    }
    recurrences.push(rec);

    for (const month of rangeOfMonths(startMonth, lastMonth)) {
      const item = byMonth.get(month);
      if (!item) {
        overrides.push({ recurrenceId: id, month, amountCents: null, skipped: true }); // buraco: a regra pulou este mês
      } else if (toCents(Number(item.value)) !== expected(month)) {
        overrides.push({ recurrenceId: id, month, amountCents: toCents(Number(item.value)), skipped: false });
      }
    }
  }

  // Renda por mês (a renda padrão global do app antigo é ignorada)
  const income: ImportIncome[] = [];
  for (const [key, value] of Object.entries(dados)) {
    const m = /^cfin_renda_(\d{1,2})_(\d{4})$/.exec(key);
    if (m && Number.isFinite(Number(value))) income.push({ month: ymOf(Number(m[1]), Number(m[2])), amountCents: toCents(Number(value)) });
  }
  income.sort((a, b) => a.month.localeCompare(b.month));

  // Saldo bancário: histórico de cada mês, em ordem; se não fecha com o saldo guardado, entra um ajuste
  const bankEntries: ImportBankEntry[] = [];
  const bankMonths = new Set<string>();
  for (const key of Object.keys(dados)) {
    const m = /^cfin_(?:bhist|banco)_(\d{1,2})_(\d{4})$/.exec(key);
    if (m) bankMonths.add(`${m[1]}_${m[2]}`);
  }
  for (const mk of [...bankMonths].sort()) {
    const [mi, yr] = mk.split('_').map(Number);
    const month = ymOf(mi, yr);
    const hist = (Array.isArray(dados[`cfin_bhist_${mk}`]) ? dados[`cfin_bhist_${mk}`] : []) as { data: string; tipo: string; val: number }[];
    let balance = 0;
    let lastAt = `${month}-01T12:00:00.000Z`;
    hist.forEach((h, i) => {
      const [dd, mm, yyyy] = String(h.data).split('/');
      const day = dd && mm && yyyy ? `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}` : `${month}-01`;
      lastAt = `${day}T12:00:${pad(i % 60)}.000Z`;
      const kind = h.tipo === 'Adição' ? 'add' : 'set';
      const cents = toCents(Number(h.val));
      balance = kind === 'set' ? cents : balance + cents;
      bankEntries.push({ id: newId(), month, kind, amountCents: cents, at: lastAt });
    });
    const stored = dados[`cfin_banco_${mk}`];
    if (stored !== undefined && Number.isFinite(Number(stored))) {
      const storedCents = toCents(Number(stored));
      if (storedCents !== balance) {
        if (hist.length > 0) warnings.push(`Saldo bancário de ${month}: o histórico não fecha com o saldo guardado; entrou um ajuste para ${storedCents / 100}.`);
        const at = new Date(Date.parse(lastAt) + 1000).toISOString();
        bankEntries.push({ id: newId(), month, kind: 'set', amountCents: storedCents, at });
      }
    }
  }

  if (ignoredGroups.size > 0) {
    const total = [...ignoredGroups.values()].reduce((s, n) => s + n, 0);
    const names = [...ignoredGroups.keys()].sort().join(', ');
    warnings.push(`${total} ${total === 1 ? 'item' : 'itens'} de grupos que não aparecem no app (${names}) foram ignorados.`);
  }
  if (skippedInvalid > 0) warnings.push(`${skippedInvalid} item(ns) com valor inválido foram ignorados.`);

  return { groups, categories, entries, recurrences, overrides, income, bankEntries, warnings };
}
