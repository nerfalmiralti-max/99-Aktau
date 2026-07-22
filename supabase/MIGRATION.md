# Миграция почасового бронирования

Для новой пустой базы выполните [`schema.sql`](schema.sql). Для существующей базы
используйте additive migration
[`migrations/202607220001_booking_duration_and_conflicts.sql`](migrations/202607220001_booking_duration_and_conflicts.sql).

Миграция не удаляет заявки и не пересчитывает исторические суммы. Старым
почасовым записям назначается длительность 1 час, записям акции — 3 часа;
`estimated_total` получает прежнее значение `price`.

## Порядок применения

1. Создайте backup базы и убедитесь, что можно восстановить его.
2. Выполните preflight-запросы ниже и сохраните результат.
3. Если обнаружены некорректные записи или пересечения, согласуйте их вручную с
   владельцем. Не удаляйте и не отклоняйте их автоматически.
4. Выполните migration целиком в Supabase SQL Editor. Она обёрнута в транзакцию.
5. Проверьте новые поля и RPC-функции.
6. Только после этого разворачивайте API, вызывающий `create_booking_request_v2`.

## Preflight

```sql
select id, booking_date, booking_time, room, tariff_type, price
from public.bookings
where booking_date is null
   or booking_time is null
   or room not in ('Основной зал', 'VIP-зал')
   or tariff_type not in ('hourly', 'promotion')
   or price is null
   or price <= 0;

select a.id as first_id, b.id as second_id, a.room
from public.bookings a
join public.bookings b on a.id < b.id and a.room = b.room
where a.status in ('pending', 'accepted')
  and b.status in ('pending', 'accepted')
  and ((a.booking_date + a.booking_time) at time zone 'Asia/Aqtau')
      < ((b.booking_date + b.booking_time) at time zone 'Asia/Aqtau')
        + make_interval(hours => case when b.tariff_type = 'promotion' then 3 else 1 end)
  and ((b.booking_date + b.booking_time) at time zone 'Asia/Aqtau')
      < ((a.booking_date + a.booking_time) at time zone 'Asia/Aqtau')
        + make_interval(hours => case when a.tariff_type = 'promotion' then 3 else 1 end);

select phone_normalized, count(*)
from public.bookings
where status in ('pending', 'accepted')
  and ((booking_date + booking_time) at time zone 'Asia/Aqtau')
      + make_interval(hours => case when tariff_type = 'promotion' then 3 else 1 end) > now()
group by phone_normalized
having count(*) > 1;
```

## Добавленные инварианты

- `duration_hours` — целое значение от 1 до 12;
- `start_at` и `end_at` — `timestamptz` по часовому поясу `Asia/Aqtau`;
- `end_at = start_at + duration_hours`;
- `hourly_price` — снимок почасовой цены;
- `estimated_total` и совместимое поле `price` — серверный итог;
- конфликт: `existing.start_at < proposed_end` и
  `existing.end_at > proposed_start`; соседние интервалы разрешены;
- на один нормализованный номер допускается только одна активная будущая заявка: учитываются `pending` и `accepted` с `end_at > now()`; `rejected`, удалённые, завершившиеся и прошлые заявки не блокируют;
- принятие ранее отклонённой заявки повторно проверяет лимит и пересечение.

Старая RPC-сигнатура `create_booking_request` сохранена как wrapper для
совместимости, но итоговую сумму всё равно вычисляет новая серверная функция.
