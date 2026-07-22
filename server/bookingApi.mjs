import { createHmac, timingSafeEqual } from "node:crypto";
import {
  calculateBookingQuote,
  isValidDurationHours,
} from "../shared/bookingPolicy.mjs";
import { hasValidAdminSession } from "./adminAuth.mjs";
import { BookingConflictError, BookingValidationError } from "./bookingErrors.mjs";
import {
  applyCorsHeaders,
  createRateLimiter,
  setSecurityHeaders,
  verifyTrustedOrigin,
} from "./security.mjs";

const GUEST_COOKIE = "aktau_guest_booking";
const GUEST_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY_SIZE = 32 * 1024;
const ROOMS = new Set(["Основной зал", "VIP-зал"]);
const TARIFFS = new Set(["hourly", "promotion"]);
const STATUSES = new Set(["accepted", "rejected"]);
const TOO_MANY_ATTEMPTS_MESSAGE = "Слишком много попыток. Попробуйте позже.";
const bookingRateLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, payload, headers = {}) {
  response.statusCode = status;
  setSecurityHeaders(response);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    if (Buffer.byteLength(JSON.stringify(request.body)) > MAX_BODY_SIZE) {
      throw new HttpError(413, "Запрос слишком большой");
    }
    return request.body;
  }
  if (typeof request.body === "string" || Buffer.isBuffer(request.body)) {
    const body = String(request.body || "{}");
    if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
      throw new HttpError(413, "Запрос слишком большой");
    }
    return JSON.parse(body);
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

function containsUnsafeContent(value) {
  return /[<>]/.test(value)
    || /(?:javascript:|on\w+\s*=|<\s*script)/i.test(value)
    || /(?:--|\/\*|\*\/|\bunion\s+select\b|\binformation_schema\b|['"]\s*(?:or|and)\s+['"]?\w+|(?:^|;)\s*(?:drop|delete|insert|update|select|alter|create)\s+\w+)/i.test(value);
}

function textField(payload, name, { maxLength, optional = false }) {
  const value = payload[name];
  if ((value === undefined || value === null) && optional) {
    return "";
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "Некорректные данные заявки");
  }
  const text = [...value.trim()]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("");
  if (!optional && !text) {
    throw new HttpError(400, "Некорректные данные заявки");
  }
  if (text.length > maxLength) {
    throw new HttpError(400, "Некорректные данные заявки");
  }
  if (containsUnsafeContent(text)) {
    throw new HttpError(400, "Некорректные данные заявки");
  }
  return text;
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
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(400, "Некорректные данные заявки");
  }
  if (typeof payload.price === "number" && payload.price < 0) {
    throw new HttpError(400, "Некорректные данные заявки");
  }

  const name = textField(payload, "name", { maxLength: 80 });
  const phone = textField(payload, "phone", { maxLength: 32 });
  const phoneNormalized = normalizePhone(phone);
  const date = textField(payload, "date", { maxLength: 10 });
  const time = textField(payload, "time", { maxLength: 5 });
  const room = textField({ room: payload.roomType ?? payload.room }, "room", { maxLength: 32 });
  const tariff = textField({ tariff: payload.tariffType ?? payload.tariff }, "tariff", { maxLength: 16 });
  const comment = textField(payload, "comment", { maxLength: 500, optional: true });
  const durationHours = payload.durationHours;

  if (name.length < 2) {
    throw new HttpError(400, "Введите имя");
  }
  if (!/^[+\d\s().-]+$/.test(phone) || phoneNormalized.length < 10 || phoneNormalized.length > 15) {
    throw new HttpError(400, "Введите корректный телефон");
  }
  if (!isValidDate(date)) {
    throw new HttpError(400, "Выберите корректную дату");
  }
  if (date < new Date().toISOString().slice(0, 10)) {
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
  if (!isValidDurationHours(durationHours)) {
    throw new HttpError(400, "Продолжительность должна быть целым числом от 1 до 12 часов");
  }
  if (payload.privacyConsent !== true) {
    throw new HttpError(400, "Подтвердите согласие на обработку данных");
  }

  let quote;
  try {
    quote = calculateBookingQuote(room, tariff, durationHours, date, time);
  } catch {
    const message = tariff === "promotion"
      ? "Акция 2+1 доступна на 3 часа с завершением не позднее 00:00 по времени Актау"
      : "Проверьте дату, время и продолжительность бронирования";
    throw new HttpError(400, message);
  }
  if (Date.parse(quote.startAt) <= Date.now()) {
    throw new HttpError(400, "Выберите будущие дату и время");
  }

  return {
    name,
    phone,
    phoneNormalized,
    date,
    time,
    room,
    tariff,
    durationHours,
    ...quote,
    price: quote.estimatedTotal,
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
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function guestBooking(booking) {
  return {
    id: booking.id,
    name: booking.name,
    phone: booking.phone,
    date: booking.date,
    time: booking.time,
    durationHours: booking.durationHours,
    startAt: booking.startAt,
    endAt: booking.endAt,
    endDate: booking.endDate,
    endTime: booking.endTime,
    room: booking.room,
    tariff: booking.tariff,
    hourlyPrice: booking.hourlyPrice,
    baseTotal: booking.baseTotal,
    promotionDiscount: booking.promotionDiscount,
    estimatedTotal: booking.estimatedTotal,
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
    setSecurityHeaders(response);
    applyCorsHeaders(request, response);

    if (method === "OPTIONS" && pathname.startsWith("/api/")) {
      if (!verifyTrustedOrigin(request, { requireHeader: true })) {
        sendJson(response, 403, { message: "Запрос отклонён" });
        return;
      }
      response.statusCode = 204;
      response.end();
      return;
    }
    if (pathname.startsWith("/api/admin/") && !verifyTrustedOrigin(request)) {
      sendJson(response, 403, { message: "Запрос отклонён" });
      return;
    }

    try {
      if (method === "POST" && pathname === "/api/bookings") {
        const rateLimit = bookingRateLimiter.check(request);
        if (rateLimit.limited) {
          sendJson(response, 429, { message: TOO_MANY_ATTEMPTS_MESSAGE }, {
            "Retry-After": String(rateLimit.retryAfter),
          });
          return;
        }
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
        if (!verifyTrustedOrigin(request, { requireHeader: true })) {
          sendJson(response, 403, { message: "Запрос отклонён" });
          return;
        }
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
        if (!verifyTrustedOrigin(request, { requireHeader: true })) {
          sendJson(response, 403, { message: "Запрос отклонён" });
          return;
        }
        requireAdmin(request);
        if (!(await store.deleteBooking(bookingMatch[1]))) {
          throw new HttpError(404, "Заявка не найдена");
        }
        sendJson(response, 200, { message: "Заявка удалена" });
        return;
      }

      if (method === "DELETE" && pathname === "/api/admin/bookings") {
        if (!verifyTrustedOrigin(request, { requireHeader: true })) {
          sendJson(response, 403, { message: "Запрос отклонён" });
          return;
        }
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
      if (error instanceof BookingValidationError) {
        sendJson(response, 400, { message: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        sendJson(response, 400, { message: "Некорректный запрос" });
        return;
      }
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : "Внутренняя ошибка сервера";
      sendJson(response, status, { message });
    }
  };
}
