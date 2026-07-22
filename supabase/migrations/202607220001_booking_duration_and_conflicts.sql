-- Additive migration for hourly bookings. Apply this before deploying API code
-- that calls create_booking_request_v2. It never deletes or rewrites a booking's
-- historical price. Run the preflight queries documented in supabase/MIGRATION.md first.
begin;

alter table public.bookings add column if not exists duration_hours smallint;
alter table public.bookings add column if not exists start_at timestamptz;
alter table public.bookings add column if not exists end_at timestamptz;
alter table public.bookings add column if not exists hourly_price integer;
alter table public.bookings add column if not exists estimated_total integer;

update public.bookings
set duration_hours = case when tariff_type = 'promotion' then 3 else 1 end
where duration_hours is null;
update public.bookings
set hourly_price = case room when 'Основной зал' then 1000 when 'VIP-зал' then 1500 end
where hourly_price is null;
update public.bookings set estimated_total = price where estimated_total is null;
update public.bookings
set start_at = (booking_date + booking_time) at time zone 'Asia/Aqtau'
where start_at is null;
update public.bookings
set end_at = start_at + make_interval(hours => duration_hours)
where end_at is null;

alter table public.bookings alter column duration_hours set default 1;
alter table public.bookings alter column duration_hours set not null;
alter table public.bookings alter column start_at set not null;
alter table public.bookings alter column end_at set not null;
alter table public.bookings alter column hourly_price set not null;
alter table public.bookings alter column estimated_total set not null;

do $$ begin
  alter table public.bookings add constraint bookings_duration_check
    check (duration_hours between 1 and 12 and duration_hours = trunc(duration_hours));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.bookings add constraint bookings_interval_check
    check (end_at = start_at + make_interval(hours => duration_hours));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.bookings add constraint bookings_hourly_price_check
    check (hourly_price > 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.bookings add constraint bookings_estimated_total_check
    check (estimated_total > 0);
exception when duplicate_object then null; end $$;

create index if not exists bookings_room_interval_idx
  on public.bookings (room, start_at, end_at)
  where status in ('pending', 'accepted');
create index if not exists bookings_phone_active_end_idx
  on public.bookings (phone_normalized, status, end_at desc);

-- The function bodies and grants below intentionally mirror supabase/schema.sql.
-- Keeping them in one transaction means partial migrations are rolled back.
create or replace function public.create_booking_request_v2(
  p_name text, p_phone text, p_phone_normalized text, p_booking_date date,
  p_booking_time time, p_duration_hours smallint, p_room text,
  p_tariff_type text, p_comment text
)
returns setof public.bookings language plpgsql security definer set search_path = public
as $$
declare
  expected_hourly_price integer; expected_total integer;
  proposed_start timestamptz; proposed_end timestamptz; promotion_deadline timestamptz;
  created_booking public.bookings;
begin
  if p_duration_hours is null or p_duration_hours < 1 or p_duration_hours > 12 then
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_DURATION';
  end if;
  expected_hourly_price := case p_room when 'Основной зал' then 1000 when 'VIP-зал' then 1500 else null end;
  if expected_hourly_price is null or p_tariff_type not in ('hourly', 'promotion') then
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_POLICY';
  end if;
  proposed_start := (p_booking_date + p_booking_time) at time zone 'Asia/Aqtau';
  proposed_end := proposed_start + make_interval(hours => p_duration_hours);
  if proposed_start <= now() then
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_TIME';
  end if;
  if p_tariff_type = 'promotion' then
    promotion_deadline := ((p_booking_date + 1)::timestamp) at time zone 'Asia/Aqtau';
    if p_duration_hours <> 3 or proposed_end > promotion_deadline then
      raise exception using errcode = 'P0001', message = 'INVALID_PROMOTION_TIME';
    end if;
    expected_total := case p_room when 'Основной зал' then 2000 else 3500 end;
  else expected_total := expected_hourly_price * p_duration_hours;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('phone:' || p_phone_normalized, 0));
  perform pg_advisory_xact_lock(hashtextextended('room:' || p_room, 0));
  if (select count(*) from public.bookings where phone_normalized = p_phone_normalized
    and status in ('pending', 'accepted') and end_at > now()) >= 1 then
    raise exception using errcode = 'P0001', message = 'ACTIVE_BOOKING_LIMIT';
  end if;
  if exists (select 1 from public.bookings where room = p_room
    and status in ('pending', 'accepted') and start_at < proposed_end and end_at > proposed_start) then
    raise exception using errcode = 'P0001', message = 'BOOKING_INTERVAL_CONFLICT';
  end if;
  insert into public.bookings (
    name, phone, phone_normalized, booking_date, booking_time, duration_hours,
    start_at, end_at, room, tariff_type, hourly_price, estimated_total, price, comment, status
  ) values (
    p_name, p_phone, p_phone_normalized, p_booking_date, p_booking_time, p_duration_hours,
    proposed_start, proposed_end, p_room, p_tariff_type, expected_hourly_price,
    expected_total, expected_total, p_comment, 'pending'
  ) returning * into created_booking;
  return next created_booking;
end; $$;

-- Preserve the original RPC signature while old clients are being retired.
-- Historical callers may submit p_price, but the v2 function remains the
-- authority and independently derives all stored amounts.
create or replace function public.create_booking_request(
  p_name text, p_phone text, p_phone_normalized text, p_booking_date date,
  p_booking_time time, p_room text, p_tariff_type text, p_price integer,
  p_comment text
)
returns setof public.bookings language plpgsql security definer set search_path = public
as $$
declare expected_price integer; legacy_duration smallint;
begin
  legacy_duration := case when p_tariff_type = 'promotion' then 3 else 1 end;
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
  return query select * from public.create_booking_request_v2(
    p_name, p_phone, p_phone_normalized, p_booking_date, p_booking_time,
    legacy_duration, p_room, p_tariff_type, p_comment
  );
end; $$;

create or replace function public.update_booking_status(p_booking_id uuid, p_status text)
returns setof public.bookings language plpgsql security definer set search_path = public
as $$
declare target public.bookings; updated_booking public.bookings;
begin
  if p_status not in ('accepted', 'rejected') then
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_STATUS';
  end if;
  select * into target from public.bookings where id = p_booking_id for update;
  if not found then return; end if;
  if p_status = 'accepted' then
    perform pg_advisory_xact_lock(hashtextextended('phone:' || target.phone_normalized, 0));
    perform pg_advisory_xact_lock(hashtextextended('room:' || target.room, 0));
    if (select count(*) from public.bookings where id <> target.id
      and phone_normalized = target.phone_normalized
      and status in ('pending', 'accepted') and end_at > now()) >= 1 then
      raise exception using errcode = 'P0001', message = 'ACTIVE_BOOKING_LIMIT';
    end if;
    if exists (select 1 from public.bookings where id <> target.id and room = target.room
      and status in ('pending', 'accepted') and start_at < target.end_at and end_at > target.start_at) then
      raise exception using errcode = 'P0001', message = 'BOOKING_INTERVAL_CONFLICT';
    end if;
  end if;
  update public.bookings set status = p_status where id = p_booking_id returning * into updated_booking;
  return next updated_booking;
end; $$;

revoke all on function public.create_booking_request_v2(
  text, text, text, date, time, smallint, text, text, text
) from public, anon, authenticated;
revoke all on function public.create_booking_request(
  text, text, text, date, time, text, text, integer, text
) from public, anon, authenticated;
revoke all on function public.update_booking_status(uuid, text) from public, anon, authenticated;
grant execute on function public.create_booking_request_v2(
  text, text, text, date, time, smallint, text, text, text
) to service_role;
grant execute on function public.create_booking_request(
  text, text, text, date, time, text, text, integer, text
) to service_role;
grant execute on function public.update_booking_status(uuid, text) to service_role;

commit;
