create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  phone_normalized text not null,
  booking_date date not null,
  booking_time time not null,
  room text not null check (room in ('Основной зал', 'VIP-зал')),
  tariff_type text not null default 'hourly',
  price integer not null,
  comment text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.bookings add column if not exists phone_normalized text;
alter table public.bookings add column if not exists tariff_type text default 'hourly';
alter table public.bookings add column if not exists price integer;
alter table public.bookings add column if not exists status text default 'pending';

update public.bookings
set phone_normalized = case
  when length(regexp_replace(phone, '[^0-9]', '', 'g')) = 11
    and left(regexp_replace(phone, '[^0-9]', '', 'g'), 1) = '8'
  then '7' || substring(regexp_replace(phone, '[^0-9]', '', 'g') from 2)
  else regexp_replace(phone, '[^0-9]', '', 'g')
end
where phone_normalized is null or phone_normalized = '';

update public.bookings set tariff_type = 'hourly' where tariff_type is null;
update public.bookings set status = 'pending' where status is null;
update public.bookings
set price = case room
  when 'Основной зал' then 1000
  when 'VIP-зал' then 1500
end
where price is null;

alter table public.bookings alter column phone_normalized set not null;
alter table public.bookings alter column tariff_type set default 'hourly';
alter table public.bookings alter column tariff_type set not null;
alter table public.bookings alter column price set not null;
alter table public.bookings alter column status set default 'pending';
alter table public.bookings alter column status set not null;

do $$
begin
  alter table public.bookings
    add constraint bookings_tariff_type_check
    check (tariff_type in ('hourly', 'promotion'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.bookings
    add constraint bookings_status_check
    check (status in ('pending', 'accepted', 'rejected'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.bookings
    add constraint bookings_price_check
    check (price > 0);
exception when duplicate_object then null;
end $$;

create index if not exists bookings_phone_status_idx
  on public.bookings (phone_normalized, status, created_at desc);

create index if not exists bookings_created_at_idx
  on public.bookings (created_at desc);

alter table public.bookings enable row level security;

drop policy if exists "Allow public booking inserts" on public.bookings;
drop policy if exists "Allow clients to read their recent submitted bookings" on public.bookings;
drop policy if exists "Allow clients to remove expired bookings" on public.bookings;

revoke all on public.bookings from anon, authenticated;
grant select, insert, update, delete on public.bookings to service_role;

create or replace function public.create_booking_request(
  p_name text,
  p_phone text,
  p_phone_normalized text,
  p_booking_date date,
  p_booking_time time,
  p_room text,
  p_tariff_type text,
  p_price integer,
  p_comment text
)
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_price integer;
  created_booking public.bookings;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_phone_normalized, 0));

  if (
    select count(*)
    from public.bookings
    where phone_normalized = p_phone_normalized
      and status in ('pending', 'accepted')
  ) >= 2 then
    raise exception using errcode = 'P0001', message = 'ACTIVE_BOOKING_LIMIT';
  end if;

  expected_price := case
    when p_room = 'Основной зал' and p_tariff_type = 'hourly' then 1000
    when p_room = 'Основной зал' and p_tariff_type = 'promotion' then 2000
    when p_room = 'VIP-зал' and p_tariff_type = 'hourly' then 1500
    when p_room = 'VIP-зал' and p_tariff_type = 'promotion' then 3500
    else null
  end;

  if expected_price is null or p_price <> expected_price then
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_PRICE';
  end if;

  insert into public.bookings (
    name,
    phone,
    phone_normalized,
    booking_date,
    booking_time,
    room,
    tariff_type,
    price,
    comment,
    status
  ) values (
    p_name,
    p_phone,
    p_phone_normalized,
    p_booking_date,
    p_booking_time,
    p_room,
    p_tariff_type,
    p_price,
    p_comment,
    'pending'
  )
  returning * into created_booking;

  return next created_booking;
end;
$$;

revoke all on function public.create_booking_request(
  text, text, text, date, time, text, text, integer, text
) from public, anon, authenticated;

grant execute on function public.create_booking_request(
  text, text, text, date, time, text, text, integer, text
) to service_role;
