-- ==============================================================================
-- MOTORISTAPRO — MIGRAÇÃO DO MÓDULO DIÁRIO DE CORRIDAS
-- ==============================================================================
-- Executar no SQL Editor do painel do Supabase.
-- Cria a tabela 'ride_logs', índice de busca rápida e políticas de segurança RLS.
-- ==============================================================================

-- 1. Criar a tabela de registros diários de corridas
create table if not exists public.ride_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ride_date date not null,
  platform text not null check (platform in ('uber', '99', 'ambas')),
  km_driven numeric(10,2) not null default 0,
  hours_driven numeric(6,2) not null default 0,
  total_rides integer not null default 0,
  gross_earnings numeric(12,2) not null default 0,
  fuel_expenses numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Garante estritamente um único registro por usuário para cada data
  constraint ride_logs_user_date_key unique (user_id, ride_date)
);

-- 2. Habilitar Row Level Security (RLS)
alter table public.ride_logs enable row level security;

-- 3. Políticas de Segurança RLS (acesso exclusivo do próprio usuário autenticado)
drop policy if exists "Users can view their own ride logs" on public.ride_logs;
create policy "Users can view their own ride logs"
  on public.ride_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own ride logs" on public.ride_logs;
create policy "Users can insert their own ride logs"
  on public.ride_logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own ride logs" on public.ride_logs;
create policy "Users can update their own ride logs"
  on public.ride_logs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own ride logs" on public.ride_logs;
create policy "Users can delete their own ride logs"
  on public.ride_logs
  for delete
  using (auth.uid() = user_id);

-- 4. Índice de performance por usuário e data
create index if not exists idx_ride_logs_user_date on public.ride_logs(user_id, ride_date desc);

-- 5. Conceder permissões explícitas para usuários autenticados
grant select, insert, update, delete on public.ride_logs to authenticated;

