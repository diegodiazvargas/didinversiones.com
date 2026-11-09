-- ============================================================
-- DIDI CRM — esquema de base de datos (Supabase / Postgres)
-- Copia y pega este archivo completo en Supabase → SQL Editor → Run
-- ============================================================

-- Perfiles de vendedores/corredores (uno por usuario de Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  created_at timestamptz not null default now()
);

-- Leads / oportunidades
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  property_interest text,
  budget numeric,
  source text,
  stage text not null default 'lead' check (
    stage in ('lead', 'reunion', 'reserva', 'aprobacion', 'promesa', 'escritura', 'arriendo')
  ),
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  next_action_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bitácora de actividad por lead (notas y cambios de etapa)
create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  type text not null default 'note' check (type in ('note', 'stage_change')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists leads_stage_idx on public.leads (stage);
create index if not exists leads_assigned_idx on public.leads (assigned_to);
create index if not exists activities_lead_idx on public.lead_activities (lead_id);

-- ============================================================
-- Row Level Security
-- Modelo: todos los vendedores autenticados ven y mueven todos los
-- leads (pipeline compartido, como en Kommo). Solo admin puede borrar.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "leads_select_all" on public.leads
  for select using (auth.role() = 'authenticated');

create policy "leads_insert_auth" on public.leads
  for insert with check (auth.role() = 'authenticated');

create policy "leads_update_auth" on public.leads
  for update using (auth.role() = 'authenticated');

create policy "leads_delete_admin" on public.leads
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "activities_select_all" on public.lead_activities
  for select using (auth.role() = 'authenticated');

create policy "activities_insert_auth" on public.lead_activities
  for insert with check (auth.role() = 'authenticated');

-- Mantener updated_at al día en cada cambio de un lead
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();
