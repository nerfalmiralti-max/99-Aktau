import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import handleAdminAuth from "./adminAuth.mjs";

const previousEnvironment = {
  password: process.env.ADMIN_PASSWORD,
  secret: process.env.ADMIN_SESSION_SECRET,
  vercel: process.env.VERCEL,
};

let baseUrl;
let server;

before(async () => {
  process.env.ADMIN_PASSWORD = "test-admin-password";
  process.env.ADMIN_SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  process.env.VERCEL = "1";
  server = createServer(handleAdminAuth);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  for (const [name, value] of Object.entries(previousEnvironment)) {
    const key = name === "password"
      ? "ADMIN_PASSWORD"
      : name === "secret"
        ? "ADMIN_SESSION_SECRET"
        : "VERCEL";
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test("admin authentication creates, validates and clears a protected session", async () => {
  const wrong = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong-password" }),
  });
  assert.equal(wrong.status, 401);
  assert.equal((await wrong.json()).message, "Неверный пароль");

  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { authenticated: true });
  const cookieHeader = login.headers.get("set-cookie");
  assert.match(cookieHeader, /aktau_admin_session=/);
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /SameSite=Strict/);
  assert.match(cookieHeader, /Secure/);
  const cookie = cookieHeader.split(";")[0];

  const guestSession = await fetch(`${baseUrl}/api/admin/session`);
  assert.equal(guestSession.status, 401);

  const authenticatedSession = await fetch(`${baseUrl}/api/admin/session`, {
    headers: { Cookie: cookie },
  });
  assert.equal(authenticatedSession.status, 200);
  assert.deepEqual(await authenticatedSession.json(), { authenticated: true });

  const logout = await fetch(`${baseUrl}/api/admin/logout`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});
