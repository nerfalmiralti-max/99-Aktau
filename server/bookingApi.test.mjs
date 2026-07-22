import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { MAX_ACTIVE_BOOKINGS_PER_PHONE } from "../shared/bookingPolicy.mjs";
import handleAdminAuth from "./adminAuth.mjs";
import { createBookingHandler } from "./bookingApi.mjs";
import { ActiveBookingLimitError } from "./bookingErrors.mjs";

const PASSWORD = "test-admin-password";
const SECRET = "test-booking-session-secret-with-at-least-32-characters";
const MAIN_ROOM = "\u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u0437\u0430\u043b";
const bookings = [];

const store = {
  async createBooking(input) {
    const activeCount = bookings.filter((booking) => (
      booking.phoneNormalized === input.phoneNormalized
      && ["pending", "accepted"].includes(booking.status)
      && Date.parse(booking.endAt) > Date.now()
    )).length;
    if (activeCount >= MAX_ACTIVE_BOOKINGS_PER_PHONE) {
      throw new ActiveBookingLimitError();
    }
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
  const method = options.method ?? "GET";
  const includeOrigin = method !== "GET" && method !== "HEAD";
  let body = options.body;
  if (path === "/api/bookings" && method === "POST" && typeof body === "string") {
    const payload = JSON.parse(body);
    if (payload.durationHours === undefined) {
      payload.durationHours = (payload.tariffType ?? payload.tariff) === "promotion" ? 3 : 1;
    }
    body = JSON.stringify(payload);
  }
  return fetch(`${baseUrl}${path}`, {
    ...options,
    body,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(includeOrigin ? { Origin: baseUrl } : {}),
      ...options.headers,
    },
  });
}

async function invokeBookingHandler(request) {
  const headers = new Map();
  const response = {
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    end(body = "") {
      this.body = body;
    },
  };
  await bookingHandler(request, response);
  return {
    body: JSON.parse(response.body || "{}"),
    status: response.statusCode,
  };
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
      privacyConsent: true,
    }),
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.booking.tariff, "promotion");
  assert.equal(body.booking.price, 2000);
  assert.equal(body.booking.durationHours, 3);
  assert.equal(body.booking.hourlyPrice, 1000);
  assert.equal(body.booking.baseTotal, 3000);
  assert.equal(body.booking.promotionDiscount, 1000);
  assert.equal(body.booking.estimatedTotal, 2000);
  assert.equal(body.booking.endTime, "22:00");
  assert.equal(body.booking.status, "pending");
  guestCookie = response.headers.get("set-cookie").split(";")[0];
  guestBookingId = body.booking.id;

  const mine = await api("/api/bookings/mine", { headers: { Cookie: guestCookie } });
  assert.equal(mine.status, 200);
  assert.equal((await mine.json()).booking.id, body.booking.id);

  const anonymousMine = await api("/api/bookings/mine");
  assert.equal((await anonymousMine.json()).booking, null);
});

test("guest must confirm privacy consent before creating a booking", async () => {
  const response = await api("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      name: "Клиент",
      phone: "+7 701 777 88 99",
      date: "2099-12-31",
      time: "18:00",
      roomType: "Основной зал",
      tariffType: "hourly",
      comment: "",
    }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "Подтвердите согласие на обработку данных");
});

test("booking validation rejects unsafe and malformed input", async () => {
  const unsafe = await api("/api/bookings", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.21" },
    body: JSON.stringify({
      name: "<script>alert(1)</script>",
      phone: "+7 701 777 88 99",
      date: "2099-12-31",
      time: "18:00",
      roomType: MAIN_ROOM,
      tariffType: "hourly",
      comment: "hello",
      privacyConsent: true,
    }),
  });
  assert.equal(unsafe.status, 400);

  const forgedPrice = await api("/api/bookings", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.22" },
    body: JSON.stringify({
      name: "РљР»РёРµРЅС‚",
      phone: "+7 701 777 88 98",
      date: "2099-12-31",
      time: "18:00",
      roomType: MAIN_ROOM,
      tariffType: "hourly",
      price: -100,
      comment: "hello",
      privacyConsent: true,
    }),
  });
  assert.equal(forgedPrice.status, 400);

  const malformed = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl, "x-forwarded-for": "203.0.113.23" },
    body: "{",
  });
  assert.equal(malformed.status, 400);

  const pastDate = await api("/api/bookings", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.24" },
    body: JSON.stringify({
      name: "Клиент",
      phone: "+7 701 777 88 97",
      date: "2000-01-01",
      time: "18:00",
      roomType: MAIN_ROOM,
      tariffType: "hourly",
      comment: "",
      privacyConsent: true,
    }),
  });
  assert.equal(pastDate.status, 400);
  assert.equal((await pastDate.json()).message, "Выберите корректную дату");
});

test("duration validation accepts 1 and 12, rejects 0, 13 and fractions", async () => {
  for (const [durationHours, expectedStatus] of [[1, 201], [12, 201], [0, 400], [13, 400], [1.5, 400]]) {
    const response = await api("/api/bookings", {
      method: "POST",
      headers: { "x-forwarded-for": `203.0.113.${40 + Number(durationHours)}` },
      body: JSON.stringify({
        name: `Клиент ${durationHours}`,
        phone: `+7 702 000 00 ${String(Math.round(Number(durationHours) * 10)).padStart(2, "0")}`,
        date: "2099-11-30",
        time: "08:00",
        durationHours,
        room: durationHours === 12 ? "VIP-зал" : "Основной зал",
        tariff: "hourly",
        comment: "",
        privacyConsent: true,
      }),
    });
    assert.equal(response.status, expectedStatus);
  }
});

test("server calculates end time and total and ignores a forged positive total", async () => {
  const response = await api("/api/bookings", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.61" },
    body: JSON.stringify({
      name: "Ночной гость",
      phone: "+7 702 111 22 33",
      date: "2099-10-31",
      time: "23:00",
      durationHours: 2,
      room: "VIP-зал",
      tariff: "hourly",
      estimatedTotal: 1,
      endAt: "2000-01-01T00:00:00.000Z",
      price: 1,
      comment: "",
      privacyConsent: true,
    }),
  });
  assert.equal(response.status, 201);
  const booking = (await response.json()).booking;
  assert.equal(booking.endDate, "2099-11-01");
  assert.equal(booking.endTime, "01:00");
  assert.equal(booking.hourlyPrice, 1500);
  assert.equal(booking.estimatedTotal, 3000);
  assert.equal(booking.price, 3000);
});

test("promotion is fixed to three hours and cannot run past Aktau midnight", async () => {
  const invalidDuration = await api("/api/bookings", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.62" },
    body: JSON.stringify({
      name: "Клиент акции",
      phone: "+7 702 222 33 44",
      date: "2099-09-30",
      time: "18:00",
      durationHours: 2,
      room: "Основной зал",
      tariff: "promotion",
      comment: "",
      privacyConsent: true,
    }),
  });
  assert.equal(invalidDuration.status, 400);

  const afterMidnight = await api("/api/bookings", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.63" },
    body: JSON.stringify({
      name: "Поздний клиент",
      phone: "+7 702 222 33 45",
      date: "2099-09-30",
      time: "21:01",
      durationHours: 3,
      room: "VIP-зал",
      tariff: "promotion",
      comment: "",
      privacyConsent: true,
    }),
  });
  assert.equal(afterMidnight.status, 400);
});

test("one normalized phone can have only one active future booking", async () => {
  const normalizedPhone = "77053334455";
  const submitForPhone = (phone, ip, time = "08:00") => api("/api/bookings", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: JSON.stringify({
      name: "Проверка лимита",
      phone,
      date: "2099-08-15",
      time,
      durationHours: 1,
      room: "Основной зал",
      tariff: "hourly",
      comment: "",
      privacyConsent: true,
    }),
  });

  const pending = await submitForPhone("+7 705 333 44 55", "203.0.113.71");
  assert.equal(pending.status, 201);
  const pendingBooking = (await pending.json()).booking;

  const blockedByPending = await submitForPhone("8 (705) 333-44-55", "203.0.113.72", "10:00");
  assert.equal(blockedByPending.status, 409);
  assert.match((await blockedByPending.json()).message, /активная будущая заявка/);

  await store.updateBookingStatus(pendingBooking.id, "accepted");
  const blockedByAccepted = await submitForPhone("+7 705 333 44 55", "203.0.113.73", "11:00");
  assert.equal(blockedByAccepted.status, 409);

  await store.updateBookingStatus(pendingBooking.id, "rejected");
  const allowedAfterRejection = await submitForPhone("+7 705 333 44 55", "203.0.113.74", "12:00");
  assert.equal(allowedAfterRejection.status, 201);
  const allowedAfterRejectionBooking = (await allowedAfterRejection.json()).booking;

  await store.deleteBooking(allowedAfterRejectionBooking.id);
  const allowedAfterDeletion = await submitForPhone("+7 705 333 44 55", "203.0.113.75", "13:00");
  assert.equal(allowedAfterDeletion.status, 201);
  const allowedAfterDeletionBooking = (await allowedAfterDeletion.json()).booking;
  await store.deleteBooking(allowedAfterDeletionBooking.id);

  const expiredId = randomUUID();
  bookings.unshift({
    id: expiredId,
    name: "Истёкшая заявка",
    phone: "+7 705 333 44 55",
    phoneNormalized: normalizedPhone,
    date: "2000-01-01",
    time: "08:00",
    durationHours: 1,
    startAt: "2000-01-01T03:00:00.000Z",
    endAt: "2000-01-01T04:00:00.000Z",
    endDate: "2000-01-01",
    endTime: "09:00",
    room: "Основной зал",
    tariff: "hourly",
    hourlyPrice: 1000,
    baseTotal: 1000,
    promotionDiscount: 0,
    estimatedTotal: 1000,
    price: 1000,
    comment: "",
    status: "accepted",
    createdAt: "2000-01-01T03:00:00.000Z",
  });
  const allowedAfterExpiry = await submitForPhone("+7 705 333 44 55", "203.0.113.76", "14:00");
  assert.equal(allowedAfterExpiry.status, 201);
  await store.deleteBooking((await allowedAfterExpiry.json()).booking.id);
  await store.deleteBooking(expiredId);
  await store.deleteBooking(pendingBooking.id);
});

test("booking creation rejects an oversized pre-parsed request body", async () => {
  const response = await invokeBookingHandler({
    body: { comment: "x".repeat(33 * 1024) },
    headers: {
      host: "99-aktau.vercel.app",
      origin: "https://99-aktau.vercel.app",
      "x-forwarded-for": "203.0.113.25",
    },
    method: "POST",
    url: "/api/bookings",
  });
  assert.equal(response.status, 413);
  assert.equal(response.body.message, "Запрос слишком большой");
});

test("guest cannot list or change bookings through admin API", async () => {
  const foreignList = await api("/api/admin/bookings", {
    headers: { Origin: "https://example.com" },
  });
  assert.equal(foreignList.status, 403);

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
  assert.equal((await list.json()).bookings.length, bookings.length);

  const id = guestBookingId;
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
      privacyConsent: true,
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

test("booking creation is rate limited per IP", async () => {
  for (let index = 0; index < 10; index += 1) {
    const response = await api("/api/bookings", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.77" },
      body: JSON.stringify({
        name: `РљР»РёРµРЅС‚ ${index}`,
        phone: `+7 701 555 0${String(index).padStart(3, "0")}`,
        date: "2099-12-31",
        time: "19:00",
        roomType: MAIN_ROOM,
        tariffType: "hourly",
        comment: "",
        privacyConsent: true,
      }),
    });
    assert.equal(response.status, 201);
  }

  const limited = await api("/api/bookings", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.77" },
    body: JSON.stringify({
      name: "РљР»РёРµРЅС‚ 11",
      phone: "+7 701 555 9999",
      date: "2099-12-31",
      time: "20:00",
      roomType: MAIN_ROOM,
      tariffType: "hourly",
      comment: "",
      privacyConsent: true,
    }),
  });
  assert.equal(limited.status, 429);
  assert.equal(
    (await limited.json()).message,
    "\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u043f\u043e\u043f\u044b\u0442\u043e\u043a. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.",
  );
});
