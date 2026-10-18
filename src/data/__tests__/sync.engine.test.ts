import { createRepos } from '../repos';
import { SYNC_TABLES } from '../sync/tables';
import { pendingCount, resetLocal, syncOnce, type SyncOptions } from '../sync/engine';
import { createTestDeps } from './helpers/deps';
import { FakeRemote } from './helpers/fakeRemote';

const T0 = Date.UTC(2026, 9, 18, 10, 0, 0);

/** Um "aparelho": banco local próprio, ids próprios e relógio começando `minutesAfter` depois. */
async function device(prefix: string, minutesAfter = 0) {
  const deps = await createTestDeps({ prefix, base: T0 + minutesAfter * 60_000 });
  return { deps, db: deps.db, repos: createRepos(deps) };
}
type Dev = Awaited<ReturnType<typeof device>>;

const sync = (d: Dev, remote: FakeRemote, extra: Partial<SyncOptions> = {}) =>
  syncOnce(d.db, remote, { userId: 'u1', now: d.deps.now, ...extra });

const entryInput = (groupId: string) => ({
  groupId, description: 'x', amountCents: 1, month: '2026-10', occurredOn: '2026-10-01',
});

const remoteGroup = (id: string, updated_at: string) => ({
  user_id: 'u1', id, name: id, color: '#000', sort_order: 0, is_pix: false,
  created_at: '2026-10-18T10:00:00.000Z', updated_at, deleted_at: null,
});

describe('syncOnce', () => {
  it('envia e marca como limpo', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    await A.repos.groups.create({ name: 'Nubank', color: '#7c3aed' });
    expect(await pendingCount(A.db)).toBe(1);
    const r = await sync(A, remote);
    expect(r.pushed).toBe(1);
    expect(await pendingCount(A.db)).toBe(0);
    expect(remote.rows('groups')).toHaveLength(1);
  });

  it('propaga para o outro aparelho, com tipos e datas idênticos', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    const B = await device('B');
    const g = await A.repos.groups.create({ name: 'PIX', color: '#00b87a' });
    await A.repos.groups.setPix(g.id);
    await sync(A, remote);
    const r = await sync(B, remote);
    expect(r.pulled).toBe(1);
    expect(r.changedLocal).toBe(true);
    expect(await B.repos.groups.list()).toEqual(await A.repos.groups.list());
  });

  it('as sete tabelas vão e voltam iguais', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    const B = await device('B');
    const g = await A.repos.groups.create({ name: 'G', color: '#111111' });
    const c = await A.repos.categories.create({ name: 'C', color: '#222222' });
    await A.repos.entries.create({ ...entryInput(g.id), categoryId: c.id });
    const rec = await A.repos.recurrences.create({
      groupId: g.id, categoryId: c.id, description: 'Tim', kind: 'fixed', amountCents: 6499,
      totalCents: 0, startMonth: '2026-05', endMonth: null, installments: 0, firstInstallment: 1, dueDay: 10,
    });
    await A.repos.overrides.upsert({ recurrenceId: rec.id, month: '2026-10', amountCents: 7000, skipped: false });
    await A.repos.income.set('2026-10', 600000);
    await A.repos.bankEntries.add('2026-10', 1000);
    await sync(A, remote);
    await sync(B, remote);
    for (const spec of SYNC_TABLES) {
      const order = spec.key.join(', ');
      const a = await A.db.all(`SELECT * FROM ${spec.name} ORDER BY ${order}`);
      const b = await B.db.all(`SELECT * FROM ${spec.name} ORDER BY ${order}`);
      expect(a.length).toBe(1);
      expect(b).toEqual(a);
    }
  });

  it('conflito: a edição mais nova vence nos dois aparelhos', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    const B = await device('B', 60); // relógio de B anda uma hora à frente
    const g = await A.repos.groups.create({ name: 'Original', color: '#111111' });
    await sync(A, remote);
    await sync(B, remote);
    await A.repos.groups.update(g.id, { name: 'A1' }); // offline em A (mais antiga)
    await B.repos.groups.update(g.id, { name: 'B1' }); // offline em B (mais nova)
    await sync(A, remote);
    await sync(B, remote);
    await sync(A, remote);
    expect((await A.repos.groups.list())[0].name).toBe('B1');
    expect((await B.repos.groups.list())[0].name).toBe('B1');
  });

  it('envio fora de ordem: a edição antiga chega depois e perde', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    const B = await device('B', 60);
    const g = await A.repos.groups.create({ name: 'Original', color: '#111111' });
    await sync(A, remote);
    await sync(B, remote);
    await A.repos.groups.update(g.id, { name: 'A1' });
    await B.repos.groups.update(g.id, { name: 'B1' });
    await sync(B, remote); // B (mais nova) envia primeiro
    await sync(A, remote); // A (mais antiga) envia depois
    expect(remote.rows('groups')[0].name).toBe('B1');
    expect((await A.repos.groups.list())[0].name).toBe('B1');
  });

  it('exclusão lógica propaga', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    const B = await device('B');
    const e = await A.repos.entries.create(entryInput('g'));
    await sync(A, remote);
    await sync(B, remote);
    expect(await B.repos.entries.listByMonth('2026-10')).toHaveLength(1);
    await A.repos.entries.remove(e.id);
    await sync(A, remote);
    await sync(B, remote);
    expect(await B.repos.entries.listByMonth('2026-10')).toEqual([]);
  });

  it('edição feita durante o envio não se perde', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    const e = await A.repos.entries.create(entryInput('g'));
    await sync(A, remote);
    await A.repos.entries.update(e.id, { amountCents: 2 });
    let edited = false;
    remote.beforeUpsert = async (table) => {
      if (table === 'entries' && !edited) {
        edited = true;
        await A.repos.entries.update(e.id, { amountCents: 3 }); // usuário edita no meio do envio
      }
    };
    await sync(A, remote);
    remote.beforeUpsert = undefined;
    const row = await A.db.first<{ dirty: number; amount_cents: number }>(
      'SELECT dirty, amount_cents FROM entries WHERE id = ?', [e.id],
    );
    expect(row).toMatchObject({ dirty: 1, amount_cents: 3 });
    await sync(A, remote);
    expect(remote.rows('entries')[0].amount_cents).toBe(3);
    expect(await pendingCount(A.db)).toBe(0);
  });

  it('paginação: traz tudo, sem duplicar nem pular', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    const B = await device('B');
    for (let i = 0; i < 7; i++) await A.repos.groups.create({ name: `G${i}`, color: '#111111' });
    await sync(A, remote);
    remote.fetchCalls = [];
    await sync(B, remote, { pageSize: 3 });
    expect((await B.repos.groups.list()).map((g) => g.name)).toEqual(
      ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
    );
    expect(remote.fetchCalls.filter((c) => c.table === 'groups')).toHaveLength(3);
  });

  it('é idempotente: a segunda sincronização não muda nada', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    const B = await device('B');
    await A.repos.groups.create({ name: 'G', color: '#111111' });
    await sync(A, remote);
    await sync(B, remote);
    const r = await sync(B, remote);
    expect(r).toEqual({ pushed: 0, pulled: 0, changedLocal: false });
  });

  it('janela de releitura: linha atrasada dentro de 20 do cursor entra; fora, não', async () => {
    const remote = new FakeRemote();
    const B = await device('B');
    remote.inject('groups', remoteGroup('base', '2026-10-18T10:00:01.000Z'), 100);
    await sync(B, remote); // cursor = 100
    remote.inject('groups', remoteGroup('late-in', '2026-10-18T10:00:02.000Z'), 90);
    remote.inject('groups', remoteGroup('late-out', '2026-10-18T10:00:03.000Z'), 50);
    await sync(B, remote);
    const ids = (await B.db.all<{ id: string }>('SELECT id FROM groups ORDER BY id')).map((r) => r.id);
    expect(ids).toEqual(['base', 'late-in']);
  });

  it('o cursor persiste e a leitura seguinte parte dele (com a janela)', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    for (let i = 0; i < 30; i++) await A.repos.groups.create({ name: `G${i}`, color: '#111111' });
    await sync(A, remote);
    const st = await A.db.first<{ value: string }>("SELECT value FROM sync_state WHERE key = 'cursor:groups'");
    expect(st?.value).toBe('30');
    remote.fetchCalls = [];
    await sync(A, remote);
    expect(remote.fetchCalls.find((c) => c.table === 'groups')?.after).toBe(10);
  });

  it('só um grupo PIX sobra quando dois aparelhos marcam grupos diferentes', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    const B = await device('B', 60);
    const g1 = await A.repos.groups.create({ name: 'G1', color: '#111111' });
    const g2 = await A.repos.groups.create({ name: 'G2', color: '#222222' });
    await sync(A, remote);
    await sync(B, remote);
    await A.repos.groups.setPix(g1.id); // mais antigo
    await B.repos.groups.setPix(g2.id); // mais novo
    for (let i = 0; i < 3; i++) {
      await sync(A, remote);
      await sync(B, remote);
    }
    for (const d of [A, B]) {
      const list = await d.repos.groups.list();
      expect(list.find((g) => g.id === g1.id)?.isPix).toBe(false);
      expect(list.find((g) => g.id === g2.id)?.isPix).toBe(true);
    }
  });

  it('falha de rede: rejeita, nada é marcado como enviado, e a próxima conclui', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    await A.repos.groups.create({ name: 'G', color: '#111111' });
    remote.failNext(1);
    await expect(sync(A, remote)).rejects.toThrow('network');
    expect(await pendingCount(A.db)).toBe(1);
    await sync(A, remote);
    expect(await pendingCount(A.db)).toBe(0);
  });

  it('recusa conta diferente da dona dos dados locais, sem tocar na rede', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    await A.repos.groups.create({ name: 'G', color: '#111111' });
    await sync(A, remote, { userId: 'u1' });
    remote.fetchCalls = [];
    await expect(sync(A, remote, { userId: 'u2' })).rejects.toMatchObject({ code: 'ACCOUNT_MISMATCH' });
    expect(remote.fetchCalls).toEqual([]);
  });

  it('dados criados antes do login são adotados pela conta e sobem', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    await A.repos.groups.create({ name: 'G', color: '#111111' });
    expect(await A.db.first("SELECT value FROM sync_state WHERE key = 'user_id'")).toBeNull();
    await sync(A, remote, { userId: 'u1' });
    const st = await A.db.first<{ value: string }>("SELECT value FROM sync_state WHERE key = 'user_id'");
    expect(st?.value).toBe('u1');
    expect(remote.rows('groups')).toHaveLength(1);
  });
});

describe('resetLocal', () => {
  it('apaga os dados e o estado de sincronização', async () => {
    const remote = new FakeRemote();
    const A = await device('A');
    await A.repos.groups.create({ name: 'G', color: '#111111' });
    await sync(A, remote);
    await resetLocal(A.db);
    for (const spec of SYNC_TABLES) {
      expect(await A.db.all(`SELECT 1 FROM ${spec.name}`)).toEqual([]);
    }
    expect(await A.db.all('SELECT 1 FROM sync_state')).toEqual([]);
  });
});
