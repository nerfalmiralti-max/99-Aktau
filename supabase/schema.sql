create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  booking_date date not null,
  booking_time time not null,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Allow public booking inserts"
on public.bookings
for insert
to anon
with check (true);

create policy "Allow clients to read their recent submitted bookings"
on public.bookings
for select
to anon
using (created_at > now() - interval '1 hour');
