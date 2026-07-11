import { createBookingHandler } from "./bookingApi.mjs";
import { createSupabaseBookingStore } from "./supabaseBookingStore.mjs";

let bookingHandler;

function configurationError(response) {
  const message = process.env.VERCEL_ENV === "development"
    ? "Не настроены переменные окружения"
    : "Сервис временно недоступен";
  response.statusCode = 503;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify({ message }));
}

export default function handleVercelRequest(request, response) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !sessionSecret ||
    sessionSecret.length < 32 ||
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    configurationError(response);
    return;
  }

  if (!bookingHandler) {
    bookingHandler = createBookingHandler({
      store: createSupabaseBookingStore({
        url: supabaseUrl,
        serviceRoleKey: supabaseServiceRoleKey,
      }),
      sessionSecret,
      secureCookies: true,
    });
  }

  return bookingHandler(request, response);
}
