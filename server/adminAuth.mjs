import { createHmac, timingSafeEqual } from "node:crypto";
import {
  applyCorsHeaders,
  createRateLimiter,
  setSecurityHeaders,
  verifyTrustedOrigin,
} from "./security.mjs";

const SESSION_COOKIE = "aktau_admin_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const MAX_BODY_SIZE = 8 * 1024;
const TOO_MANY_ATTEMPTS_MESSAGE = "Слишком много попыток. Попробуйте позже.";
const adminLoginRateLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

function sendJson(response, status, payload, headers = {}) {
  response.statusCode = status;
  setSecurityHeaders(response);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));
  response.end(JSON.stringify(payload));
}

function constantTimeMatch(value, expected) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        const name = separator >= 0 ? part.slice(0, separator) : part;
        const value = separator >= 0 ? part.slice(separator + 1) : "";
        return [name, decodeURIComponent(value)];
      }),
  );
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
      throw new Error("REQUEST_TOO_LARGE");
    }
  }
  return JSON.parse(body || "{}");
}

function sessionToken(secret, expiresAt) {
  const payload = String(expiresAt);
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function hasValidSession(request, secret) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) {
    return false;
  }

  const separator = token.indexOf(".");
  if (separator < 1) {
    return false;
  }

  const expiresAtValue = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiresAt = Number(expiresAtValue);
  const expected = createHmac("sha256", secret).update(expiresAtValue).digest("base64url");
  return Number.isFinite(expiresAt) && expiresAt > Date.now() && constantTimeMatch(signature, expected);
}

export function hasValidAdminSession(request, secret) {
  return hasValidSession(request, secret);
}

function sessionCookie(token, maxAge) {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function logEnvironmentIssue(kind, name) {
  console.error(`${kind} environment variable: ${name}`);
}

function readEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    logEnvironmentIssue("Missing", name);
    return null;
  }
  return value;
}

function configurationForPath(pathname) {
  const secret = readEnvironment("ADMIN_SESSION_SECRET");
  if (!secret) {
    return null;
  }
  if (secret.length < 32) {
    logEnvironmentIssue("Invalid", "ADMIN_SESSION_SECRET");
    return null;
  }

  if (pathname !== "/api/admin/login") {
    return { secret };
  }

  const password = readEnvironment("ADMIN_PASSWORD");
  if (!password) {
    return null;
  }
  if (password.length < 8) {
    logEnvironmentIssue("Invalid", "ADMIN_PASSWORD");
    return null;
  }

  return { password, secret };
}

export default async function handleAdminAuth(request, response) {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  setSecurityHeaders(response);
  applyCorsHeaders(request, response);

  if (request.method === "OPTIONS" && pathname.startsWith("/api/admin/")) {
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

  const config = configurationForPath(pathname);
  if (!config) {
    sendJson(response, 503, { message: "Сервис авторизации временно недоступен" });
    return;
  }

  try {
    if (request.method === "POST" && pathname === "/api/admin/login") {
      if (!verifyTrustedOrigin(request, { requireHeader: true })) {
        sendJson(response, 403, { message: "Запрос отклонён" });
        return;
      }
      const rateLimit = adminLoginRateLimiter.check(request);
      if (rateLimit.limited) {
        sendJson(response, 429, { message: TOO_MANY_ATTEMPTS_MESSAGE }, {
          "Retry-After": String(rateLimit.retryAfter),
        });
        return;
      }
      const payload = await readJson(request);
      const password = typeof payload.password === "string" ? payload.password : "";
      if (!constantTimeMatch(password, config.password)) {
        console.warn("Invalid admin credentials");
        sendJson(response, 401, { message: "Неверный пароль" });
        return;
      }

      const expiresAt = Date.now() + SESSION_DURATION_MS;
      sendJson(response, 200, { authenticated: true }, {
        "Set-Cookie": sessionCookie(
          sessionToken(config.secret, expiresAt),
          Math.floor(SESSION_DURATION_MS / 1000),
        ),
      });
      return;
    }

    if (request.method === "GET" && pathname === "/api/admin/session") {
      if (!hasValidSession(request, config.secret)) {
        sendJson(response, 401, { message: "Требуется вход администратора" });
        return;
      }
      sendJson(response, 200, { authenticated: true });
      return;
    }

    if (request.method === "POST" && pathname === "/api/admin/logout") {
      if (!verifyTrustedOrigin(request, { requireHeader: true })) {
        sendJson(response, 403, { message: "Запрос отклонён" });
        return;
      }
      sendJson(response, 200, { authenticated: false }, {
        "Set-Cookie": sessionCookie("", 0),
      });
      return;
    }

    response.setHeader("Allow", pathname.endsWith("/session") ? "GET" : "POST");
    sendJson(response, 405, { message: "Метод не поддерживается" });
  } catch {
    sendJson(response, 400, { message: "Некорректный запрос" });
  }
}
