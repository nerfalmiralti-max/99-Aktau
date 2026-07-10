create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  booking_date date not null,
  booking_time time not null,
  room text not null check (room in ('Основной зал', 'VIP-зал')),
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
using (created_at > now() - interval '24 hours');

create policy "Allow clients to remove expired bookings"
on public.bookings
for delete
to anon
using (created_at <= now() - interval '24 hours');
