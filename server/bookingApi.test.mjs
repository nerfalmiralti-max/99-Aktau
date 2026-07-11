import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import handleAdminAuth from "./adminAuth.mjs";
import { createBookingHandler } from "./bookingApi.mjs";

const PASSWORD = "test-admin-password";
const SECRET = "test-booking-session-secret-with-at-least-32-characters";
const bookings = [];

const store = {
  async createBooking(input) {
    const booking = {
      ...input,
      id: randomUUID(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    bookings.unshift(booking);
    return booking;
  },
  async listBookings() {
    return bookings.map((booking) => ({ ...booking }));
  },
  async getBooking(id) {
    const booking = bookings.find((item) => item.id === id);
    return booking ? { ...booking } : null;
  },
  async updateBookingStatus(id, status) {
    const booking = bookings.find((item) => item.id === id);
    if (!booking) {
      return null;
    }
    booking.status = status;
    return { ...booking };
  },
  async deleteBooking(id) {
    const index = bookings.findIndex((item) => item.id === id);
    if (index < 0) {
      return false;
    }
    bookings.splice(index, 1);
    return true;
  },
  async clearBookings() {
    const count = bookings.length;
    bookings.splice(0);
    return count;
  },
};

const bookingHandler = createBookingHandler({
  store,
  sessionSecret: SECRET,
  secureCookies: true,
});

let baseUrl;
let server;
let previousPassword;
let previousSecret;
let previousVercel;
let guestCookie;
let guestBookingId;

function api(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
}

before(async () => {
  previousPassword = process.env.ADMIN_PASSWORD;
  previousSecret = process.env.ADMIN_SESSION_SECRET;
  previousVercel = process.env.VERCEL;
  process.env.ADMIN_PASSWORD = PASSWORD;
  process.env.ADMIN_SESSION_SECRET = SECRET;
  process.env.VERCEL = "1";
  server = createServer((request, response) => {
    if (/^\/api\/admin\/(login|session|logout)$/.test(request.url ?? "")) {
      return handleAdminAuth(request, response);
    }
    return bookingHandler(request, response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  const restore = (key, value) => value === undefined
    ? delete process.env[key]
    : process.env[key] = value;
  restore("ADMIN_PASSWORD", previousPassword);
  restore("ADMIN_SESSION_SECRET", previousSecret);
  restore("VERCEL", previousVercel);
});

test("guest creates a promotion and can only restore that booking", async () => {
  const response = await api("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      name: "Клиент",
      phone: "+7 701 111 22 33",
      date: "2099-12-31",
      time: "19:00",
      roomType: "Основной зал",
      tariffType: "promotion",
      price: 1,
      comment: "У окна",
    }),
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.booking.tariff, "promotion");
  assert.equal(body.booking.price, 2000);
  assert.equal(body.booking.status, "pending");
  guestCookie = response.headers.get("set-cookie").split(";")[0];
  guestBookingId = body.booking.id;

  const mine = await api("/api/bookings/mine", { headers: { Cookie: guestCookie } });
  assert.equal(mine.status, 200);
  assert.equal((await mine.json()).booking.id, body.booking.id);

  const anonymousMine = await api("/api/bookings/mine");
  assert.equal((await anonymousMine.json()).booking, null);
});

test("guest cannot list or change bookings through admin API", async () => {
  const list = await api("/api/admin/bookings");
  assert.equal(list.status, 401);

  const update = await api(`/api/admin/bookings/${bookings[0].id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "accepted" }),
  });
  assert.equal(update.status, 401);
  assert.equal(bookings[0].status, "pending");
});

test("admin lists, accepts and rejects bookings with persistent status", async () => {
  const login = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: PASSWORD }),
  });
  assert.equal(login.status, 200);
  const adminCookie = login.headers.get("set-cookie").split(";")[0];

  const list = await api("/api/admin/bookings", { headers: { Cookie: adminCookie } });
  assert.equal(list.status, 200);
  assert.equal((await list.json()).bookings.length, 1);

  const id = bookings[0].id;
  const accepted = await api(`/api/admin/bookings/${id}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ status: "accepted" }),
  });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).booking.status, "accepted");
  assert.equal((await store.getBooking(id)).status, "accepted");
  const acceptedMine = await api("/api/bookings/mine", { headers: { Cookie: guestCookie } });
  assert.equal((await acceptedMine.json()).booking.status, "accepted");

  const rejected = await api(`/api/admin/bookings/${id}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ status: "rejected" }),
  });
  assert.equal(rejected.status, 200);
  assert.equal((await store.getBooking(id)).status, "rejected");
  assert.equal(id, guestBookingId);
  const rejectedMine = await api("/api/bookings/mine", { headers: { Cookie: guestCookie } });
  assert.equal((await rejectedMine.json()).booking.status, "rejected");
});

test("VIP promotion uses 3500 and admin can delete and clear", async () => {
  const created = await api("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      name: "VIP клиент",
      phone: "+7 701 444 55 66",
      date: "2099-12-31",
      time: "21:00",
      room: "VIP-зал",
      tariff: "promotion",
      comment: "",
    }),
  });
  assert.equal((await created.json()).booking.price, 3500);

  const login = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: PASSWORD }),
  });
  const adminCookie = login.headers.get("set-cookie").split(";")[0];
  const id = bookings[0].id;
  const deleted = await api(`/api/admin/bookings/${id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  assert.equal(deleted.status, 200);

  const cleared = await api("/api/admin/bookings", {
    method: "DELETE",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ confirm: true }),
  });
  assert.equal(cleared.status, 200);
  assert.equal(bookings.length, 0);
});
