import { parseBackup } from '../../services/importer/parseBackup';
import { makeBackup } from '../../services/importer/__tests__/fixture';
import { applyImport } from '../importBackup';
import { loadReport } from '../reports';
import { createRepos } from '../repos';
import { pendingCount } from '../sync/engine';
import { createTestDeps } from './helpers/deps';

const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

async function setup() {
  const deps = await createTestDeps();
  const repos = createRepos(deps);
  let n = 0;
  const plan = () => parseBackup(makeBackup(), () => `imp-${++n}`);
  return { deps, repos, plan };
}

/** Dados de teste que já existiam no app antes da importação. */
async function seedOld(repos: ReturnType<typeof createRepos>) {
  const g = await repos.groups.create({ name: 'Grupo de teste', color: '#111111' });
  await repos.categories.create({ name: 'Cat de teste', color: '#222222' });
  await repos.entries.create({ groupId: g.id, description: 'Lixo', amountCents: 999, month: '2026-10', occurredOn: '2026-10-01' });
  await repos.income.set('2026-10', 123400);
  await repos.income.set('2026-03', 777700); // mês que o backup não tem
  await repos.bankEntries.set('2026-10', 5);
}

describe('applyImport', () => {
  it('os dados de teste antigos somem e os do backup aparecem', async () => {
    const { deps, repos, plan } = await setup();
    await seedOld(repos);
    await applyImport(deps, plan());

    expect((await repos.groups.list()).map((g) => g.name)).toEqual(['Nubank', 'PIX', 'Fixo']);
    expect((await repos.categories.list()).map((c) => c.name).sort()).toEqual(['Assinaturas', 'Farmácia']);
    const { report } = await loadReport(repos, MONTHS);
    expect(report.spentCents).toBeGreaterThan(0);
    expect(Object.keys(report.byGroup)).toHaveLength(2); // a fixture não tem gastos no grupo PIX
    // o lançamento "Lixo" não entra
    expect((await repos.entries.listByMonth('2026-10')).some((e) => e.description === 'Lixo')).toBe(false);
  });

  it('renda: meses do backup viram os valores importados; meses de teste deixam de existir', async () => {
    const { deps, repos, plan } = await setup();
    await seedOld(repos);
    await applyImport(deps, plan());
    expect(await repos.income.forMonth('2026-10')).toBe(600000); // o valor importado, não o de teste (123400)
    expect(await repos.income.forMonth('2026-05')).toBe(450000);
    expect(await repos.income.forMonth('2026-03')).toBe(0); // 777700 era de teste e foi apagado
  });

  it('saldo bancário de outubro vem do histórico importado', async () => {
    const { deps, repos, plan } = await setup();
    await seedOld(repos);
    await applyImport(deps, plan());
    expect(await repos.bankEntries.balance('2026-10')).toBe(198440); // 1984,40
    expect(await repos.bankEntries.balance('2026-05')).toBe(200000); // histórico + ajuste
  });

  it('exceções e recorrências do backup funcionam (junho do NuVida com valor ajustado, julho pulado)', async () => {
    const { deps, repos, plan } = await setup();
    await applyImport(deps, plan());
    const nu = (await repos.recurrences.list()).find((r) => r.description === 'NuVida')!;
    const ov = (await repos.overrides.list()).filter((o) => o.recurrenceId === nu.id);
    expect(ov.map((o) => o.month).sort()).toEqual(['2026-06', '2026-07']);
  });

  it('tudo fica pendente de sincronização, inclusive o que foi apagado', async () => {
    const { deps, repos, plan } = await setup();
    await seedOld(repos);
    const p = plan();
    await applyImport(deps, p);
    const fresh = p.groups.length + p.categories.length + p.entries.length + p.recurrences.length
      + p.overrides.length + p.income.length + p.bankEntries.length;
    expect(await pendingCount(deps.db)).toBeGreaterThanOrEqual(fresh);
    const dead = await deps.db.first<{ n: number; dirty: number }>(
      "SELECT COUNT(*) AS n, MIN(dirty) AS dirty FROM groups WHERE name = 'Grupo de teste' AND deleted_at IS NOT NULL",
    );
    expect(dead).toEqual({ n: 1, dirty: 1 });
  });

  it('o apagado fica mais antigo que o importado (a ordem certa para a sincronização)', async () => {
    const { deps, repos, plan } = await setup();
    await seedOld(repos);
    await applyImport(deps, plan());
    const old = await deps.db.first<{ u: string }>("SELECT updated_at AS u FROM groups WHERE name = 'Grupo de teste'");
    const fresh = await deps.db.first<{ u: string }>("SELECT MIN(updated_at) AS u FROM groups WHERE name = 'Nubank'");
    expect(old!.u < fresh!.u).toBe(true);
  });

  it('importar de novo substitui a importação anterior, sem duplicar', async () => {
    const { deps, repos, plan } = await setup();
    await applyImport(deps, plan());
    const first = (await loadReport(repos, MONTHS)).report;
    await applyImport(deps, plan());
    const second = (await loadReport(repos, MONTHS)).report;
    expect((await repos.groups.list())).toHaveLength(3);
    expect(second.spentCents).toBe(first.spentCents);
    expect(second.incomeCents).toBe(first.incomeCents);
  });

  it('é atômico: se algo falha no meio, nada muda', async () => {
    const { deps, repos, plan } = await setup();
    await seedOld(repos);
    const bad = plan();
    bad.entries[0] = { ...bad.entries[0], description: null as unknown as string }; // viola NOT NULL
    await expect(applyImport(deps, bad)).rejects.toThrow();
    expect((await repos.groups.list()).map((g) => g.name)).toEqual(['Grupo de teste']); // nada foi apagado
    expect(await repos.income.forMonth('2026-10')).toBe(123400);
  });
});
