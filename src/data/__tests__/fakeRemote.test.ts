import { FakeRemote } from './helpers/fakeRemote';

const g = (id: string, updated_at: string, name = 'A') => ({
  user_id: 'u1', id, name, color: '#000', sort_order: 0, is_pix: false,
  created_at: '2026-10-18T10:00:00.000Z', updated_at, deleted_at: null,
});

describe('FakeRemote', () => {
  it('atribui server_seq crescente e devolve em ordem', async () => {
    const r = new FakeRemote();
    await r.upsert('groups', [g('a', '2026-10-18T10:00:01.000Z'), g('b', '2026-10-18T10:00:02.000Z')]);
    const rows = await r.fetchAfter('groups', 0, 10);
    expect(rows.map((x) => x.id)).toEqual(['a', 'b']);
    expect(rows.map((x) => x.server_seq)).toEqual([1, 2]);
  });

  it('última escrita vence: ignora updated_at mais antigo', async () => {
    const r = new FakeRemote();
    await r.upsert('groups', [g('a', '2026-10-18T10:00:05.000Z', 'novo')]);
    await r.upsert('groups', [g('a', '2026-10-18T10:00:01.000Z', 'velho')]);
    const rows = r.rows('groups');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('novo');
    expect(rows[0].server_seq).toBe(1); // não mudou
  });

  it('aceita updated_at mais novo e renova o server_seq', async () => {
    const r = new FakeRemote();
    await r.upsert('groups', [g('a', '2026-10-18T10:00:01.000Z', 'v1')]);
    await r.upsert('groups', [g('a', '2026-10-18T10:00:09.000Z', 'v2')]);
    expect(r.rows('groups')[0]).toMatchObject({ name: 'v2', server_seq: 2 });
  });

  it('pagina por limit e respeita after', async () => {
    const r = new FakeRemote();
    for (let i = 1; i <= 5; i++) await r.upsert('groups', [g(`g${i}`, `2026-10-18T10:00:0${i}.000Z`)]);
    expect((await r.fetchAfter('groups', 0, 2)).map((x) => x.id)).toEqual(['g1', 'g2']);
    expect((await r.fetchAfter('groups', 2, 10)).map((x) => x.id)).toEqual(['g3', 'g4', 'g5']);
  });

  it('devolve datas no formato do Postgres (+00:00)', async () => {
    const r = new FakeRemote();
    await r.upsert('groups', [g('a', '2026-10-18T10:00:01.000Z')]);
    expect((await r.fetchAfter('groups', 0, 1))[0].updated_at).toBe('2026-10-18T10:00:01.000+00:00');
  });

  it('failNext faz as próximas chamadas rejeitarem', async () => {
    const r = new FakeRemote();
    r.failNext(1);
    await expect(r.fetchAfter('groups', 0, 1)).rejects.toThrow('network');
    await expect(r.fetchAfter('groups', 0, 1)).resolves.toEqual([]);
  });
});
