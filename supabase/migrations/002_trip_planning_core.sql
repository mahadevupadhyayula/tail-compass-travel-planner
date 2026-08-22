begin;

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  pet_type text not null check (pet_type in ('Dog','Cat')),
  breed text not null,
  size_category text not null check (size_category in ('small','medium','large')),
  estimated_weight_kg numeric not null check (estimated_weight_kg > 0),
  vaccinations text not null,
  vaccination_date date not null,
  care_profile text not null check (care_profile in ('standard','special_needs','service_animal')),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  origin text,
  destination text,
  start_date date,
  end_date date,
  purpose_id text references public.purpose_options(id) on delete set null,
  travel_mode text check (travel_mode is null or travel_mode in ('air','road','rail')),
  transport_option_id text references public.transport_options(id) on delete set null,
  stay_option_id text references public.stay_options(id) on delete set null,
  selected_activity_ids text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','ready_for_review','approved','generating','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.itinerary_versions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  itinerary_json jsonb not null,
  user_notes text,
  status text not null default 'draft' check (status in ('draft','approved','superseded')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trip_id, version_number)
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  itinerary_version_id uuid not null references public.itinerary_versions(id) on delete restrict,
  idempotency_key text not null unique,
  status text not null default 'queued' check (status in ('queued','processing','generating_images','rendering_pdf','completed','failed','cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100),
  status_message text,
  input_snapshot jsonb not null,
  generated_images jsonb not null default '[]'::jsonb,
  pdf_path text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists pets_user_id_idx on public.pets(user_id);
create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_pet_id_idx on public.trips(pet_id);
create index if not exists itinerary_versions_trip_id_idx on public.itinerary_versions(trip_id);
create index if not exists generation_jobs_trip_id_idx on public.generation_jobs(trip_id);
create index if not exists generation_jobs_status_idx on public.generation_jobs(status);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images','profile-images',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('generated-itineraries','generated-itineraries',false,26214400,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

alter table public.app_users enable row level security;
alter table public.pets enable row level security;
alter table public.trips enable row level security;
alter table public.itinerary_versions enable row level security;
alter table public.generation_jobs enable row level security;

create policy "users read own profile" on public.app_users for select to authenticated using (auth_user_id = auth.uid());
create policy "users update own profile" on public.app_users for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy "users read own pets" on public.pets for select to authenticated using (exists (select 1 from public.app_users u where u.id=user_id and u.auth_user_id=auth.uid()));
create policy "users read own trips" on public.trips for select to authenticated using (exists (select 1 from public.app_users u where u.id=user_id and u.auth_user_id=auth.uid()));
create policy "users read own itineraries" on public.itinerary_versions for select to authenticated using (exists (select 1 from public.trips t join public.app_users u on u.id=t.user_id where t.id=trip_id and u.auth_user_id=auth.uid()));
create policy "users read own generation jobs" on public.generation_jobs for select to authenticated using (exists (select 1 from public.trips t join public.app_users u on u.id=t.user_id where t.id=trip_id and u.auth_user_id=auth.uid()));

commit;

-- Compensating rollback: export non-demo rows, then drop generation_jobs,
-- itinerary_versions, trips, pets and app_users in reverse dependency order.
