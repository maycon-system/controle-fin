import { createRecurrencesRepo } from '../repos/recurrences';
import { createTestDeps } from './helpers/deps';

const fixed = {
  groupId: 'g1', categoryId: 'c1', description: 'Tim', kind: 'fixed' as const,
  amountCents: 6499, totalCents: 0, startMonth: '2026-05', endMonth: null,
  installments: 0, firstInstallment: 1, dueDay: 10,
};
const parc = {
  groupId: 'g1', categoryId: null, description: 'Curso', kind: 'installment' as const,
  amountCents: 0, totalCents: 168000, startMonth: '2026-10', endMonth: null,
  installments: 12, firstInstallment: 4, dueDay: null,
};

describe('recurrences repo', () => {
  it('cria fixo e parcelado e lê de volta com todos os campos', async () => {
    const repo = createRecurrencesRepo(await createTestDeps());
    const f = await repo.create(fixed);
    const p = await repo.create(parc);
    expect(await repo.get(f.id)).toEqual({ ...fixed, id: f.id });
    expect(await repo.get(p.id)).toEqual({ ...parc, id: p.id });
    expect((await repo.list()).map((r) => r.id).sort()).toEqual([f.id, p.id].sort());
  });

  it('get de id inexistente devolve null', async () => {
    const repo = createRecurrencesRepo(await createTestDeps());
    expect(await repo.get('nao-existe')).toBeNull();
  });

  it('update altera só os campos informados', async () => {
    const repo = createRecurrencesRepo(await createTestDeps());
    const f = await repo.create(fixed);
    await repo.update(f.id, { amountCents: 7052, description: 'Tim Controle' });
    expect(await repo.get(f.id)).toEqual({ ...fixed, id: f.id, amountCents: 7052, description: 'Tim Controle' });
  });

  it('setEndMonth persiste e aceita null', async () => {
    const repo = createRecurrencesRepo(await createTestDeps());
    const f = await repo.create(fixed);
    await repo.setEndMonth(f.id, '2026-08');
    expect((await repo.get(f.id))?.endMonth).toBe('2026-08');
    await repo.setEndMonth(f.id, null);
    expect((await repo.get(f.id))?.endMonth ?? null).toBeNull();
  });

  it('remover é lógico: some de list e de get', async () => {
    const repo = createRecurrencesRepo(await createTestDeps());
    const f = await repo.create(fixed);
    await repo.remove(f.id);
    expect(await repo.list()).toEqual([]);
    expect(await repo.get(f.id)).toBeNull();
  });
});
