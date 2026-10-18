import { createOverridesRepo } from '../repos/overrides';
import { createTestDeps } from './helpers/deps';

describe('overrides repo', () => {
  it('upsert duas vezes no mesmo mês mantém uma linha', async () => {
    const repo = createOverridesRepo(await createTestDeps());
    await repo.upsert({ recurrenceId: 'r1', month: '2026-06', amountCents: 7052, skipped: false });
    await repo.upsert({ recurrenceId: 'r1', month: '2026-06', amountCents: 7100, skipped: false });
    const out = await repo.list();
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ recurrenceId: 'r1', month: '2026-06', amountCents: 7100, skipped: false });
  });

  it('skipped volta como true e valor nulo volta como null', async () => {
    const repo = createOverridesRepo(await createTestDeps());
    await repo.upsert({ recurrenceId: 'r1', month: '2026-06', amountCents: null, skipped: true });
    const o = (await repo.list())[0];
    expect(o.skipped).toBe(true);
    expect(o.amountCents ?? null).toBeNull();
  });

  it('remove apaga só aquele mês e upsert reativa', async () => {
    const repo = createOverridesRepo(await createTestDeps());
    await repo.upsert({ recurrenceId: 'r1', month: '2026-06', amountCents: 1, skipped: false });
    await repo.upsert({ recurrenceId: 'r1', month: '2026-07', amountCents: 2, skipped: false });
    await repo.remove('r1', '2026-06');
    expect((await repo.list()).map((o) => o.month)).toEqual(['2026-07']);
    await repo.upsert({ recurrenceId: 'r1', month: '2026-06', amountCents: 3, skipped: false });
    expect((await repo.list()).map((o) => o.month).sort()).toEqual(['2026-06', '2026-07']);
  });
});
