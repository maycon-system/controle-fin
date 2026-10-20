# Controle.fin

App de finanças pessoais (Expo + SQLite local + Supabase para login e sincronização).

## Configurar o Supabase (uma vez)

1. Crie um projeto em supabase.com/dashboard (região São Paulo).
2. **SQL Editor**: cole e rode o arquivo `supabase/migrations/20261018000000_sync_schema.sql`.
3. **Authentication → Users → Add user**: crie seu e-mail e senha (marque *Auto Confirm User*).
4. **Project Settings → API Keys**: copie a *Project URL* e a chave `sb_publishable_...`.
5. Copie `.env.example` para `.env.local` e preencha:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

Nunca coloque a chave `service_role` no app.

## Rodar

```bash
npm install
npx expo start        # celular (Expo Go / dev build)
npx expo start --web  # navegador
```

Entre com o usuário criado no passo 3. Para trazer os dados do app antigo, use a tela de importação (backup JSON).

## Verificação

```bash
npx tsc --noEmit && npx expo lint && npm test
```
