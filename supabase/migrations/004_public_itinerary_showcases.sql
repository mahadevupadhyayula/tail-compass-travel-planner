begin;

-- A deliberately curated projection for the public Recent itineraries menu.
-- It contains no user, pet, trip, job, storage, email, photo, or note identifiers.
create table if not exists public.public_itinerary_showcases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  route text not null,
  date_label text not null,
  travel_mode text not null check (travel_mode in ('air','road','rail')),
  pet_summary text,
  stay_summary text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check (not is_published or published_at is not null)
);

create index if not exists public_itinerary_showcases_published_idx
  on public.public_itinerary_showcases (published_at desc)
  where is_published;

alter table public.public_itinerary_showcases enable row level security;

drop policy if exists "public reads published itinerary showcases" on public.public_itinerary_showcases;
create policy "public reads published itinerary showcases"
  on public.public_itinerary_showcases
  for select
  to anon, authenticated
  using (is_published = true);

insert into public.public_itinerary_showcases
  (id, title, route, date_label, travel_mode, pet_summary, stay_summary, is_published, published_at)
values
  ('10000000-0000-4000-8000-000000000001', 'A slower road to Rishikesh', 'Delhi → Rishikesh', '3-day road escape', 'road', 'Large dog · gentle pace', 'Quiet riverside stay', true, now() - interval '2 hours'),
  ('10000000-0000-4000-8000-000000000002', 'Miso’s first train journey', 'Delhi → Shimla', '2-night rail escape', 'rail', 'Cat · familiar carrier', 'Calm hillside stay', true, now() - interval '1 day'),
  ('10000000-0000-4000-8000-000000000003', 'A cooler weekend by the sea', 'Mumbai → Alibaug', 'Weekend beach break', 'road', 'Small dog · heat-aware plan', 'Shaded coastal stay', true, now() - interval '2 days')
on conflict (id) do nothing;

commit;

-- Compensating rollback: set is_published=false to hide entries immediately;
-- drop the table only after confirming no curated showcase content is needed.
