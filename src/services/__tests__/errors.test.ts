import { authErrorMessage, isNetworkError } from '../errors';

describe('authErrorMessage', () => {
  it('credenciais erradas', () => {
    expect(authErrorMessage('Invalid login credentials')).toBe('E-mail ou senha incorretos.');
  });

  it('e-mail não confirmado', () => {
    expect(authErrorMessage('Email not confirmed')).toContain('confirmado');
  });

  it('limite de tentativas', () => {
    expect(authErrorMessage('Email rate limit exceeded')).toContain('Muitas tentativas');
    expect(authErrorMessage('For security purposes, you can only request this after 20 seconds')).toContain(
      'Muitas tentativas',
    );
  });

  it('sem rede', () => {
    expect(authErrorMessage('Failed to fetch')).toContain('conexão');
    expect(authErrorMessage('Network request failed')).toContain('conexão');
  });

  it('mensagem desconhecida cai num texto genérico, sem vazar inglês cru', () => {
    const m = authErrorMessage('something weird');
    expect(m).toContain('Não foi possível entrar');
  });
});

describe('isNetworkError', () => {
  it('reconhece falhas de rede do navegador e do React Native', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkError(new Error('network'))).toBe(true);
    expect(isNetworkError(new Error('groups: TypeError: Failed to fetch'))).toBe(true);
  });

  it('não confunde com outros erros', () => {
    expect(isNetworkError(new Error('permission denied for table groups'))).toBe(false);
    expect(isNetworkError('texto')).toBe(false);
  });
});
