begin;

create table if not exists public.demo_scenarios (
  key text primary key,
  label text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transport_options (
  id text primary key,
  mode text not null check (mode in ('air','road','rail')),
  operator text not null,
  pet_types text[] not null,
  min_weight_kg numeric not null default 0 check (min_weight_kg >= 0),
  max_weight_kg numeric check (max_weight_kg is null or max_weight_kg >= min_weight_kg),
  handling text not null,
  supports_special_needs boolean not null default false,
  supports_service_animals boolean not null default false,
  verification_status text not null check (verification_status in ('DEMO','CURATED','OFFICIAL','NOT_VERIFIED')),
  summary text not null,
  scenario_keys text[] not null default '{}',
  source_url text,
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stay_options (
  id text primary key,
  name text not null,
  area text not null,
  pet_types text[] not null,
  max_weight_kg numeric check (max_weight_kg is null or max_weight_kg >= 0),
  supports_special_needs boolean not null default false,
  supports_service_animals boolean not null default false,
  purpose_ids text[] not null default '{}',
  verification_status text not null check (verification_status in ('DEMO','CURATED','OFFICIAL','NOT_VERIFIED')),
  summary text not null,
  source_url text,
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purpose_options (
  id text primary key,
  label text not null,
  description text not null,
  scenario_keys text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.vaccination_requirements (
  id text primary key,
  pet_types text[] not null,
  applies_to text[] not null,
  vaccinations text[] not null,
  recency_days integer check (recency_days is null or recency_days > 0),
  verification_status text not null check (verification_status in ('DEMO','CURATED','OFFICIAL','NOT_VERIFIED')),
  source_url text,
  last_verified_at date,
  created_at timestamptz not null default now()
);

create index if not exists transport_options_mode_idx on public.transport_options(mode);
create index if not exists transport_options_pet_types_gin on public.transport_options using gin(pet_types);
create index if not exists stay_options_pet_types_gin on public.stay_options using gin(pet_types);
create index if not exists stay_options_purpose_ids_gin on public.stay_options using gin(purpose_ids);

alter table public.demo_scenarios enable row level security;
alter table public.transport_options enable row level security;
alter table public.stay_options enable row level security;
alter table public.purpose_options enable row level security;
alter table public.vaccination_requirements enable row level security;

create policy "demo catalog is readable" on public.demo_scenarios for select to anon, authenticated using (true);
create policy "transport catalog is readable" on public.transport_options for select to anon, authenticated using (true);
create policy "stay catalog is readable" on public.stay_options for select to anon, authenticated using (true);
create policy "purpose catalog is readable" on public.purpose_options for select to anon, authenticated using (true);
create policy "vaccination catalog is readable" on public.vaccination_requirements for select to anon, authenticated using (true);

commit;

-- Compensating rollback: drop these five catalog tables in reverse order only
-- after exporting any non-demo rows introduced after this migration.
