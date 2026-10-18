import { describeDbError } from '../DbErrorBoundary';

describe('describeDbError', () => {
  it('reconhece o travamento do arquivo por outra aba', () => {
    const e = new Error(
      "Failed to execute 'createSyncAccessHandle' on 'FileSystemFileHandle': Access Handles cannot be created if there is another open Access Handle",
    );
    const d = describeDbError(e);
    expect(d.title).toContain('outra aba');
    expect(d.body).toContain('uma aba por vez');
  });

  it('outros erros mostram a mensagem original', () => {
    const d = describeDbError(new Error('disk I/O error'));
    expect(d.title).toContain('banco de dados');
    expect(d.body).toBe('disk I/O error');
  });
});
