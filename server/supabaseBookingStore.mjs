import {
  ActiveBookingLimitError,
  BookingIntervalConflictError,
  BookingStoreError,
  BookingValidationError,
} from "./bookingErrors.mjs";

const BOOKING_SELECT = [
  "id",
  "name",
  "phone",
  "phone_normalized",
  "booking_date",
  "booking_time",
  "duration_hours",
  "start_at",
  "end_at",
  "room",
  "tariff_type",
  "hourly_price",
  "estimated_total",
  "price",
  "comment",
  "status",
  "created_at",
].join(",");

function localDateTime(isoValue) {
  const date = new Date(isoValue);
  const aktau = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  return {
    date: aktau.toISOString().slice(0, 10),
    time: aktau.toISOString().slice(11, 16),
  };
}

function mapBooking(row) {
  const end = localDateTime(row.end_at);
  const estimatedTotal = Number(row.estimated_total ?? row.price);
  const hourlyPrice = Number(row.hourly_price);
  const durationHours = Number(row.duration_hours);
  const baseTotal = hourlyPrice * durationHours;

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    date: row.booking_date,
    time: String(row.booking_time).slice(0, 5),
    durationHours,
    startAt: row.start_at,
    endAt: row.end_at,
    endDate: end.date,
    endTime: end.time,
    room: row.room,
    tariff: row.tariff_type,
    hourlyPrice,
    baseTotal,
    promotionDiscount: Math.max(0, baseTotal - estimatedTotal),
    estimatedTotal,
    price: estimatedTotal,
    comment: row.comment ?? "",
    status: row.status,
    createdAt: row.created_at,
  };
}

function throwSafeStoreError(responseStatus, payload) {
  const message = payload?.message;
  const code = payload?.code;
  if (message === "ACTIVE_BOOKING_LIMIT") {
    throw new ActiveBookingLimitError();
  }
  if (message === "BOOKING_INTERVAL_CONFLICT" || code === "23P01") {
    throw new BookingIntervalConflictError();
  }
  const validationMessages = {
    INVALID_BOOKING_DURATION: "Продолжительность должна быть целым числом от 1 до 12 часов",
    INVALID_BOOKING_POLICY: "Проверьте выбранный зал и тариф",
    INVALID_BOOKING_TIME: "Выберите будущие дату и время по часовому поясу Актау",
    INVALID_PROMOTION_TIME: "Акция 2+1 доступна на 3 часа с завершением не позднее 00:00",
    INVALID_BOOKING_STATUS: "Выберите допустимый статус заявки",
    INVALID_BOOKING_PRICE: "Проверьте стоимость бронирования",
  };
  if (typeof message === "string" && Object.hasOwn(validationMessages, message)) {
    throw new BookingValidationError(validationMessages[message]);
  }
  throw new BookingStoreError(`Supabase returned ${responseStatus}`);
}

export function createSupabaseBookingStore({ url, serviceRoleKey, fetchImpl = fetch }) {
  const baseUrl = url.endsWith("/") ? url : `${url}/`;

  const request = async (resource, { method = "GET", body, search = {}, prefer } = {}) => {
    const endpoint = new URL(`rest/v1/${resource}`, baseUrl);
    Object.entries(search).forEach(([key, value]) => endpoint.searchParams.set(key, value));
    const response = await fetchImpl(endpoint, {
      method,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throwSafeStoreError(response.status, payload);
    }

    return payload;
  };

  return {
    async createBooking(input) {
      const rows = await request("rpc/create_booking_request_v2", {
        method: "POST",
        body: {
          p_name: input.name,
          p_phone: input.phone,
          p_phone_normalized: input.phoneNormalized,
          p_booking_date: input.date,
          p_booking_time: input.time,
          p_duration_hours: input.durationHours,
          p_room: input.room,
          p_tariff_type: input.tariff,
          p_comment: input.comment || null,
        },
      });
      if (!Array.isArray(rows) || !rows[0]) {
        throw new BookingStoreError("Supabase did not return the created booking");
      }
      return mapBooking(rows[0]);
    },
    async listBookings() {
      const rows = await request("bookings", {
        search: { select: BOOKING_SELECT, order: "created_at.desc" },
      });
      return Array.isArray(rows) ? rows.map(mapBooking) : [];
    },
    async getBooking(id) {
      const rows = await request("bookings", {
        search: { id: `eq.${id}`, select: BOOKING_SELECT, limit: "1" },
      });
      return Array.isArray(rows) && rows[0] ? mapBooking(rows[0]) : null;
    },
    async updateBookingStatus(id, status) {
      const rows = await request("rpc/update_booking_status", {
        method: "POST",
        body: { p_booking_id: id, p_status: status },
      });
      return Array.isArray(rows) && rows[0] ? mapBooking(rows[0]) : null;
    },
    async deleteBooking(id) {
      const rows = await request("bookings", {
        method: "DELETE",
        search: { id: `eq.${id}`, select: "id" },
        prefer: "return=representation",
      });
      return Array.isArray(rows) && rows.length > 0;
    },
    async clearBookings() {
      const rows = await request("bookings", {
        method: "DELETE",
        search: { id: "not.is.null", select: "id" },
        prefer: "return=representation",
      });
      return Array.isArray(rows) ? rows.length : 0;
    },
  };
}
