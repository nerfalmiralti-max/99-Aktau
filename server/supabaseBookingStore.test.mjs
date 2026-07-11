import assert from "node:assert/strict";
import { test } from "node:test";
import { BookingConflictError } from "./bookingErrors.mjs";
import { createSupabaseBookingStore } from "./supabaseBookingStore.mjs";

const row = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Тест",
  phone: "+7 701 000 00 00",
  phone_normalized: "77010000000",
  booking_date: "2099-12-31",
  booking_time: "19:00:00",
  room: "VIP-зал",
  tariff_type: "promotion",
  price: 3500,
  comment: null,
  status: "pending",
  created_at: "2026-07-10T12:00:00.000Z",
};

function createFetchQueue(items, calls = []) {
  return async (url, options) => {
    calls.push({ url: String(url), options });
    const item = items.shift();
    return new Response(item.body === undefined ? null : JSON.stringify(item.body), {
      status: item.status,
      headers: item.body === undefined ? {} : { "Content-Type": "application/json" },
    });
  };
}

test("Supabase store creates and maps a booking through the atomic RPC", async () => {
  const calls = [];
  const store = createSupabaseBookingStore({
    url: "https://project.supabase.co",
    serviceRoleKey: "server-only-key",
    fetchImpl: createFetchQueue([{ status: 200, body: [row] }], calls),
  });
  const booking = await store.createBooking({
    name: row.name,
    phone: row.phone,
    phoneNormalized: row.phone_normalized,
    date: row.booking_date,
    time: "19:00",
    room: row.room,
    tariff: row.tariff_type,
    price: row.price,
    comment: "",
  });

  assert.equal(booking.room, "VIP-зал");
  assert.equal(booking.tariff, "promotion");
  assert.equal(booking.price, 3500);
  assert.equal(booking.status, "pending");
  assert.match(calls[0].url, /rpc\/create_booking_request$/);
  assert.equal(JSON.parse(calls[0].options.body).p_phone_normalized, "77010000000");
  assert.equal(calls[0].options.headers.Authorization, "Bearer server-only-key");
});

test("Supabase booking limit is converted to BookingConflictError", async () => {
  const store = createSupabaseBookingStore({
    url: "https://project.supabase.co",
    serviceRoleKey: "server-only-key",
    fetchImpl: createFetchQueue([
      { status: 400, body: { code: "P0001", message: "ACTIVE_BOOKING_LIMIT" } },
    ]),
  });

  await assert.rejects(
    () => store.createBooking({}),
    (error) => error instanceof BookingConflictError,
  );
});

test("Supabase store lists, restores, updates and deletes bookings", async () => {
  const calls = [];
  const acceptedRow = { ...row, status: "accepted" };
  const store = createSupabaseBookingStore({
    url: "https://project.supabase.co",
    serviceRoleKey: "server-only-key",
    fetchImpl: createFetchQueue([
      { status: 200, body: [row] },
      { status: 200, body: [row] },
      { status: 200, body: [acceptedRow] },
      { status: 200, body: [{ id: row.id }] },
      { status: 200, body: [{ id: row.id }, { id: "second" }] },
    ], calls),
  });

  assert.equal((await store.listBookings()).length, 1);
  assert.equal((await store.getBooking(row.id)).id, row.id);
  assert.equal((await store.updateBookingStatus(row.id, "accepted")).status, "accepted");
  assert.equal(JSON.parse(calls[2].options.body).status, "accepted");
  assert.equal(await store.deleteBooking(row.id), true);
  assert.equal(await store.clearBookings(), 2);
});
