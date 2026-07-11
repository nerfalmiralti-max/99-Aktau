import { BookingConflictError, BookingStoreError } from "./bookingErrors.mjs";

const BOOKING_SELECT = [
  "id",
  "name",
  "phone",
  "phone_normalized",
  "booking_date",
  "booking_time",
  "room",
  "tariff_type",
  "price",
  "comment",
  "status",
  "created_at",
].join(",");

function mapBooking(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    date: row.booking_date,
    time: String(row.booking_time).slice(0, 5),
    room: row.room,
    tariff: row.tariff_type,
    price: Number(row.price),
    comment: row.comment ?? "",
    status: row.status,
    createdAt: row.created_at,
  };
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
      if (payload?.message === "ACTIVE_BOOKING_LIMIT") {
        throw new BookingConflictError();
      }
      throw new BookingStoreError(`Supabase returned ${response.status}`);
    }

    return payload;
  };

  return {
    async createBooking(input) {
      const rows = await request("rpc/create_booking_request", {
        method: "POST",
        body: {
          p_name: input.name,
          p_phone: input.phone,
          p_phone_normalized: input.phoneNormalized,
          p_booking_date: input.date,
          p_booking_time: input.time,
          p_room: input.room,
          p_tariff_type: input.tariff,
          p_price: input.price,
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
      const rows = await request("bookings", {
        method: "PATCH",
        body: { status },
        search: { id: `eq.${id}`, select: BOOKING_SELECT },
        prefer: "return=representation",
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
