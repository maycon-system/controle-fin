-- Controle.fin: esquema de sincronização (uma conta por linha, isolado por RLS).
-- Rode uma vez no SQL Editor do projeto Supabase.

create sequence if not exists public.sync_seq;
grant usage on sequence public.sync_seq to authenticated;

-- Última escrita vence: ignora atualização mais antiga que a existente.
-- Atribui o número de leitura (cursor de sincronização) a cada gravação aceita.
create or replace function public.sync_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.server_seq := nextval('public.sync_seq');
  return new;
end
$$;

create table public.groups (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  is_pix boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_seq bigint not null default 0,
  primary key (user_id, id)
);

create table public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  name text not null,
  color text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_seq bigint not null default 0,
  primary key (user_id, id)
);

create table public.entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  group_id uuid not null,
  category_id uuid,
  description text not null,
  amount_cents bigint not null,
  month text not null,
  occurred_on date not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_seq bigint not null default 0,
  primary key (user_id, id)
);

create table public.recurrences (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  group_id uuid not null,
  category_id uuid,
  description text not null,
  kind text not null check (kind in ('fixed', 'installment')),
  amount_cents bigint not null default 0,
  total_cents bigint not null default 0,
  start_month text not null,
  end_month text,
  installments integer not null default 0,
  first_installment integer not null default 1,
  due_day integer,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_seq bigint not null default 0,
  primary key (user_id, id)
);

create table public.recurrence_overrides (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recurrence_id uuid not null,
  month text not null,
  amount_cents bigint,
  skipped boolean not null default false,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_seq bigint not null default 0,
  primary key (user_id, recurrence_id, month)
);

create table public.income (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month text not null,
  amount_cents bigint not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_seq bigint not null default 0,
  primary key (user_id, month)
);

create table public.bank_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  month text not null,
  kind text not null check (kind in ('add', 'set')),
  amount_cents bigint not null,
  at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_seq bigint not null default 0,
  primary key (user_id, id)
);

-- RLS (cada usuário só enxerga as próprias linhas), índice de leitura e guarda de escrita.
do $$
declare t text;
begin
  foreach t in array array[
    'groups', 'categories', 'entries', 'recurrences',
    'recurrence_overrides', 'income', 'bank_entries'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format('create index %I on public.%I (user_id, server_seq)', t || '_seq_idx', t);
    execute format(
      'create trigger sync_guard before insert or update on public.%I
         for each row execute function public.sync_guard()', t);
  end loop;
end
$$;
