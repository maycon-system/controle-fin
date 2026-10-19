/**
 * Conferência com o backup REAL do usuário. Só roda quando BACKUP_PATH aponta para o arquivo
 * (o arquivo tem dados pessoais e nunca é versionado). Sem a variável, o teste é ignorado.
 *
 *   BACKUP_PATH="C:/caminho/controle-fin-backup.json" npm test -- realBackup
 */
import fs from 'node:fs';

import { createRepos } from '../../../data/repos';
import { applyImport } from '../../../data/importBackup';
import { createTestDeps } from '../../../data/__tests__/helpers/deps';
import { computeOccurrences } from '../../../domain/occurrences';
import { loadReport } from '../../../data/reports';
import { parseBackup } from '../parseBackup';

const path = process.env.BACKUP_PATH;
const maybe = path ? describe : describe.skip;

maybe('backup real', () => {
  it('reproduz, por grupo e por mês, os totais do app antigo', async () => {
    const json = JSON.parse(fs.readFileSync(path as string, 'utf8'));
    const deps = await createTestDeps();
    const repos = createRepos(deps);
    let n = 0;
    const plan = parseBackup(json, () => `r-${++n}`);
    await applyImport(deps, plan);

    const groupName = new Map(plan.groups.map((g) => [g.id, g.name]));
    const oldKey = new Map(
      (json.dados.cfin_grupos as { id: string; nome: string }[]).map((g) => [g.id, g.nome]),
    );
    const exported = new Date(json.data);
    const exportMonth = `${exported.getFullYear()}-${String(exported.getMonth() + 1).padStart(2, '0')}`;

    // total esperado = soma do que o app antigo guardou em cada (grupo, mês); e só as parcelas, para os meses futuros
    const expected = new Map<string, number>();
    const expectedInst = new Map<string, number>();
    const months = new Set<string>();
    for (const [k, v] of Object.entries(json.dados as Record<string, unknown>)) {
      const m = /^cfin_([a-z0-9]+)_(\d{1,2})_(\d{4})$/.exec(k);
      if (!m || !oldKey.has(m[1]) || !Array.isArray(v)) continue;
      const month = `${m[3]}-${String(Number(m[2]) + 1).padStart(2, '0')}`;
      months.add(month);
      const key = `${oldKey.get(m[1])}|${month}`;
      for (const i of v as { value: number; rec?: string }[]) {
        const c = Math.round(i.value * 100);
        expected.set(key, (expected.get(key) ?? 0) + c);
        if (i.rec === 'parcelado') expectedInst.set(key, (expectedInst.get(key) ?? 0) + c);
      }
    }

    const [recs, ovs] = [await repos.recurrences.list(), await repos.overrides.list()];
    const diffs: string[] = [];
    let compared = 0;
    for (const month of [...months].sort()) {
      const entries = await repos.entries.listByMonth(month);
      const occ = computeOccurrences(month, entries, recs, ovs);
      const got = new Map<string, number>();
      const gotInst = new Map<string, number>();
      for (const o of occ) {
        const key = `${groupName.get(o.groupId)}|${month}`;
        got.set(key, (got.get(key) ?? 0) + o.amountCents);
        if (o.kind === 'installment') gotInst.set(key, (gotInst.get(key) ?? 0) + o.amountCents);
      }
      if (month <= exportMonth) {
        // até o mês da exportação: igual ao centavo, em todos os grupos
        for (const [key, total] of expected) {
          if (!key.endsWith('|' + month)) continue;
          compared++;
          if ((got.get(key) ?? 0) !== total) diffs.push(`${key}: antigo ${total / 100} × novo ${(got.get(key) ?? 0) / 100}`);
        }
        for (const [key, total] of got) {
          if (!expected.has(key) && total !== 0) diffs.push(`${key}: sobrou ${total / 100} no novo`);
        }
      } else {
        // depois: os fixos futuros eram cópias automáticas; as parcelas são determinísticas.
        // O app antigo só criava as cópias dos meses abertos, então o novo pode ter parcelas a MAIS, nunca a menos.
        for (const [key, total] of expectedInst) {
          if (!key.endsWith('|' + month)) continue;
          compared++;
          if ((gotInst.get(key) ?? 0) < total) diffs.push(`${key}: parcelas antigo ${total / 100} × novo ${(gotInst.get(key) ?? 0) / 100} (faltou)`);
        }
      }
    }

    // resumo para quem roda o teste
    console.log(
      JSON.stringify({
        grupos: plan.groups.length, categorias: plan.categories.length, lancamentos: plan.entries.length,
        recorrencias: plan.recurrences.length, excecoes: plan.overrides.length, renda: plan.income.length,
        saldo: plan.bankEntries.length, comparacoes: compared, avisos: plan.warnings,
      }),
    );
    expect(diffs).toEqual([]);
    expect(compared).toBeGreaterThan(20); // evita passar "no vazio"

    // saldo bancário de cada mês igual ao guardado no app antigo
    let bankChecked = 0;
    let incomeChecked = 0;
    for (const [k, v] of Object.entries(json.dados as Record<string, unknown>)) {
      const m = /^cfin_banco_(\d{1,2})_(\d{4})$/.exec(k);
      if (!m) continue;
      const month = `${m[2]}-${String(Number(m[1]) + 1).padStart(2, '0')}`;
      expect(await repos.bankEntries.balance(month)).toBe(Math.round(Number(v) * 100));
      bankChecked++;
    }
    // renda de cada mês igual à do app antigo
    for (const [k, v] of Object.entries(json.dados as Record<string, unknown>)) {
      const m = /^cfin_renda_(\d{1,2})_(\d{4})$/.exec(k);
      if (!m) continue;
      const month = `${m[2]}-${String(Number(m[1]) + 1).padStart(2, '0')}`;
      expect(await repos.income.forMonth(month)).toBe(Math.round(Number(v) * 100));
      incomeChecked++;
    }
    expect(bankChecked).toBeGreaterThan(0);
    expect(incomeChecked).toBeGreaterThan(0);
    // o relatório do mês fecha
    const { report } = await loadReport(repos, [exportMonth]);
    expect(report.spentCents).toBeGreaterThan(0);
  });
});
