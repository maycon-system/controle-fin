const NETWORK = /failed to fetch|network request failed|network|load failed|fetch failed/i;

/** Falha de rede (sem internet, DNS, servidor inalcançável). */
export function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : '';
  return NETWORK.test(msg);
}

/** Mensagem em português para erros do login do Supabase. */
export function authErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Este e-mail ainda não foi confirmado.';
  if (/rate limit|only request this after|too many/i.test(message)) {
    return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  }
  if (NETWORK.test(message)) return 'Sem conexão. O primeiro login precisa de internet.';
  return 'Não foi possível entrar. Tente novamente.';
}
