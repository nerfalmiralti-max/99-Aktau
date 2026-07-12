import { createHmac, timingSafeEqual } from "node:crypto";
import { hasValidAdminSession } from "./adminAuth.mjs";
import { BookingConflictError } from "./bookingErrors.mjs";

const GUEST_COOKIE = "aktau_guest_booking";
const GUEST_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY_SIZE = 32 * 1024;
const ROOMS = new Set(["Основной зал", "VIP-зал"]);
const TARIFFS = new Set(["hourly", "promotion"]);
const STATUSES = new Set(["accepted", "rejected"]);

const PRICE_MATRIX = {
  "Основной зал": { hourly: 1000, promotion: 2000 },
  "VIP-зал": { hourly: 1500, promotion: 3500 },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, payload, headers = {}) {
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body;
  }
  if (typeof request.body === "string" || Buffer.isBuffer(request.body)) {
    return JSON.parse(String(request.body || "{}"));
  }

  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
      throw new HttpError(413, "Запрос слишком большой");
    }
  }
  return JSON.parse(body || "{}");
}

function sanitizeText(value, maxLength, optional = false) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!optional && !text) {
    return "";
  }
  return text.slice(0, maxLength);
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateBooking(payload) {
  const name = sanitizeText(payload.name, 100);
  const phone = sanitizeText(payload.phone, 32);
  const phoneNormalized = normalizePhone(phone);
  const date = sanitizeText(payload.date, 10);
  const time = sanitizeText(payload.time, 5);
  const room = sanitizeText(payload.roomType ?? payload.room, 32);
  const tariff = sanitizeText(payload.tariffType ?? payload.tariff, 16);
  const comment = sanitizeText(payload.comment, 500, true);

  if (name.length < 2) {
    throw new HttpError(400, "Введите имя");
  }
  if (phoneNormalized.length < 10 || phoneNormalized.length > 15) {
    throw new HttpError(400, "Введите корректный телефон");
  }
  if (!isValidDate(date)) {
    throw new HttpError(400, "Выберите корректную дату");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new HttpError(400, "Выберите корректное время");
  }
  if (!ROOMS.has(room)) {
    throw new HttpError(400, "Выберите игровой зал");
  }
  if (!TARIFFS.has(tariff)) {
    throw new HttpError(400, "Выберите тариф");
  }
  if (payload.privacyConsent !== true) {
    throw new HttpError(400, "Подтвердите согласие на обработку данных");
  }

  return {
    name,
    phone,
    phoneNormalized,
    date,
    time,
    room,
    tariff,
    price: PRICE_MATRIX[room][tariff],
    comment,
  };
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

function safeMatch(value, expected) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function guestToken(id, secret, expiresAt) {
  const payload = `${id}.${expiresAt}`;
  const signature = createHmac("sha256", secret).update(`guest:${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

function guestBookingId(request, secret) {
  const token = parseCookies(request)[GUEST_COOKIE];
  if (!token) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [id, expiresAtValue, signature] = parts;
  const expiresAt = Number(expiresAtValue);
  const expected = createHmac("sha256", secret)
    .update(`guest:${id}.${expiresAtValue}`)
    .digest("base64url");
  return Number.isFinite(expiresAt) && expiresAt > Date.now() && safeMatch(signature, expected)
    ? id
    : null;
}

function cookie(name, value, maxAge, secureCookies) {
  const secure = secureCookies ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function guestBooking(booking) {
  return {
    id: booking.id,
    name: booking.name,
    phone: booking.phone,
    date: booking.date,
    time: booking.time,
    room: booking.room,
    tariff: booking.tariff,
    price: booking.price,
    comment: booking.comment,
    status: booking.status,
    createdAt: booking.createdAt,
  };
}

export function createBookingHandler({ store, sessionSecret, secureCookies = true }) {
  const requireAdmin = (request) => {
    if (!hasValidAdminSession(request, sessionSecret)) {
      throw new HttpError(401, "Требуется вход администратора");
    }
  };

  return async function bookingHandler(request, response) {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const method = request.method ?? "GET";

    try {
      if (method === "POST" && pathname === "/api/bookings") {
        const booking = await store.createBooking(validateBooking(await readJson(request)));
        const expiresAt = Date.now() + GUEST_SESSION_MS;
        sendJson(response, 201, { message: "Заявка успешно отправлена", booking: guestBooking(booking) }, {
          "Set-Cookie": cookie(
            GUEST_COOKIE,
            guestToken(booking.id, sessionSecret, expiresAt),
            Math.floor(GUEST_SESSION_MS / 1000),
            secureCookies,
          ),
        });
        return;
      }

      if (method === "GET" && pathname === "/api/bookings/mine") {
        const id = guestBookingId(request, sessionSecret);
        const booking = id ? await store.getBooking(id) : null;
        sendJson(response, 200, { booking: booking ? guestBooking(booking) : null });
        return;
      }

      if (method === "GET" && pathname === "/api/admin/bookings") {
        requireAdmin(request);
        sendJson(response, 200, { bookings: await store.listBookings() });
        return;
      }

      const bookingMatch = pathname.match(/^\/api\/admin\/bookings\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && bookingMatch) {
        requireAdmin(request);
        const payload = await readJson(request);
        if (!STATUSES.has(payload.status)) {
          throw new HttpError(400, "Некорректный статус заявки");
        }
        const booking = await store.updateBookingStatus(bookingMatch[1], payload.status);
        if (!booking) {
          throw new HttpError(404, "Заявка не найдена");
        }
        sendJson(response, 200, { message: "Статус заявки обновлён", booking });
        return;
      }

      if (method === "DELETE" && bookingMatch) {
        requireAdmin(request);
        if (!(await store.deleteBooking(bookingMatch[1]))) {
          throw new HttpError(404, "Заявка не найдена");
        }
        sendJson(response, 200, { message: "Заявка удалена" });
        return;
      }

      if (method === "DELETE" && pathname === "/api/admin/bookings") {
        requireAdmin(request);
        const payload = await readJson(request);
        if (payload.confirm !== true) {
          throw new HttpError(400, "Требуется подтверждение очистки");
        }
        sendJson(response, 200, {
          message: "Все заявки удалены",
          deletedCount: await store.clearBookings(),
        });
        return;
      }

      sendJson(response, 404, { message: "Маршрут не найден" });
    } catch (error) {
      if (error instanceof BookingConflictError) {
        sendJson(response, 409, { message: error.message });
        return;
      }
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : "Внутренняя ошибка сервера";
      sendJson(response, status, { message });
    }
  };
}
