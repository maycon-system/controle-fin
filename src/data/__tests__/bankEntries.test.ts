import { createBankEntriesRepo } from '../repos/bankEntries';
import { createTestDeps } from './helpers/deps';

describe('bankEntries repo', () => {
  it('sem entradas, o saldo é 0', async () => {
    const repo = createBankEntriesRepo(await createTestDeps());
    expect(await repo.balance('2026-10')).toBe(0);
  });

  it('set 100000 + add 90000 no mesmo mês dá 190000', async () => {
    const repo = createBankEntriesRepo(await createTestDeps());
    await repo.set('2026-10', 100000);
    await repo.add('2026-10', 90000);
    expect(await repo.balance('2026-10')).toBe(190000);
  });

  it('entradas de outro mês não contam', async () => {
    const repo = createBankEntriesRepo(await createTestDeps());
    await repo.set('2026-09', 500000);
    await repo.add('2026-10', 1000);
    expect(await repo.balance('2026-10')).toBe(1000);
    expect(await repo.balance('2026-09')).toBe(500000);
  });

  it('um set posterior redefine o saldo', async () => {
    const repo = createBankEntriesRepo(await createTestDeps());
    await repo.add('2026-10', 50000);
    await repo.set('2026-10', 100000);
    expect(await repo.balance('2026-10')).toBe(100000);
  });

  it('listByMonth devolve o histórico em ordem de data', async () => {
    const repo = createBankEntriesRepo(await createTestDeps());
    await repo.set('2026-10', 100000);
    await repo.add('2026-10', 90000);
    const list = await repo.listByMonth('2026-10');
    expect(list.map((e) => e.kind)).toEqual(['set', 'add']);
    expect(list.map((e) => e.amountCents)).toEqual([100000, 90000]);
  });
});
