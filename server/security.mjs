const DEFAULT_ALLOWED_ORIGIN = "https://99-aktau.vercel.app";

const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://vitals.vercel-insights.com https://*.supabase.co",
    "frame-src https://www.google.com https://maps.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function getHeader(request, name) {
  const headers = request.headers ?? {};
  if (typeof headers.get === "function") {
    return headers.get(name);
  }
  return headers[name.toLowerCase()] ?? headers[name] ?? null;
}

function appendVary(response, value) {
  const current = response.getHeader?.("Vary");
  const values = new Set(
    String(current ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  values.add(value);
  response.setHeader("Vary", [...values].join(", "));
}

function requestOrigin(request) {
  const host = getHeader(request, "x-forwarded-host") ?? getHeader(request, "host");
  if (!host) {
    return null;
  }
  const proto = getHeader(request, "x-forwarded-proto")
    ?? (String(host).startsWith("localhost") || String(host).startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

function originFromReferer(referer) {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function setSecurityHeaders(response) {
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    response.setHeader(name, value);
  });
}

export function isAllowedOrigin(request, origin) {
  if (!origin) {
    return false;
  }
  const allowed = new Set([DEFAULT_ALLOWED_ORIGIN]);
  const currentOrigin = requestOrigin(request);
  if (currentOrigin) {
    allowed.add(currentOrigin);
  }
  if (process.env.VERCEL_URL) {
    allowed.add(`https://${process.env.VERCEL_URL}`);
  }
  return allowed.has(origin);
}

export function applyCorsHeaders(request, response) {
  const origin = getHeader(request, "origin");
  if (origin && isAllowedOrigin(request, origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    appendVary(response, "Origin");
  }
}

export function verifyTrustedOrigin(request, { requireHeader = false } = {}) {
  const origin = getHeader(request, "origin");
  if (origin) {
    return isAllowedOrigin(request, origin);
  }
  const refererOrigin = originFromReferer(getHeader(request, "referer"));
  if (refererOrigin) {
    return isAllowedOrigin(request, refererOrigin);
  }
  return !requireHeader;
}

export function getClientIp(request) {
  const forwardedFor = String(getHeader(request, "x-forwarded-for") ?? "")
    .split(",")[0]
    .trim();
  return forwardedFor
    || String(getHeader(request, "x-real-ip") ?? "").trim()
    || request.socket?.remoteAddress
    || "unknown";
}

export function createRateLimiter({ limit, windowMs }) {
  const buckets = new Map();

  return {
    check(request) {
      const now = Date.now();
      const key = getClientIp(request);
      const current = buckets.get(key);
      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { limited: false, remaining: limit - 1 };
      }

      current.count += 1;
      if (current.count > limit) {
        return {
          limited: true,
          retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        };
      }
      return { limited: false, remaining: limit - current.count };
    },

    reset() {
      buckets.clear();
    },
  };
}
