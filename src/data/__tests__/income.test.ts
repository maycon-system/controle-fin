import { createIncomeRepo } from '../repos/income';
import { createTestDeps } from './helpers/deps';

describe('income repo', () => {
  it('sem nenhum valor definido, devolve 0', async () => {
    const repo = createIncomeRepo(await createTestDeps());
    expect(await repo.forMonth('2026-10')).toBe(0);
  });

  it('herda o último valor definido', async () => {
    const repo = createIncomeRepo(await createTestDeps());
    await repo.set('2026-06', 600000);
    expect(await repo.forMonth('2026-06')).toBe(600000);
    expect(await repo.forMonth('2026-09')).toBe(600000);
  });

  it('mês anterior ao primeiro definido devolve 0', async () => {
    const repo = createIncomeRepo(await createTestDeps());
    await repo.set('2026-06', 600000);
    expect(await repo.forMonth('2026-05')).toBe(0);
  });

  it('um novo valor vale dali em diante e não muda o passado', async () => {
    const repo = createIncomeRepo(await createTestDeps());
    await repo.set('2026-06', 600000);
    await repo.set('2026-09', 450000);
    expect(await repo.forMonth('2026-08')).toBe(600000);
    expect(await repo.forMonth('2026-10')).toBe(450000);
  });

  it('set no mesmo mês substitui', async () => {
    const repo = createIncomeRepo(await createTestDeps());
    await repo.set('2026-06', 600000);
    await repo.set('2026-06', 650000);
    expect(await repo.forMonth('2026-06')).toBe(650000);
  });
});
