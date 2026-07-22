import type { AdminBooking, BookingInput, BookingRequest, BookingStatus } from "./types";

export class BookingApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BookingApiError";
    this.status = status;
  }
}

export async function requestJson<Response>(path: string, options: RequestInit = {}) {
  let response: globalThis.Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new BookingApiError(0, "Не удалось подключиться к серверу");
  }

  const text = await response.text();
  let payload: ({ message?: string } & Response) | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as { message?: string } & Response;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const fallback = response.status === 401
      ? "Требуется вход администратора"
      : response.status === 409
        ? "Выбранное время недоступно либо на номер уже оформлена активная будущая заявка"
        : response.status >= 500 || response.status === 404
          ? "Сервис временно недоступен"
          : "Проверьте данные заявки";
    throw new BookingApiError(response.status, payload?.message ?? fallback);
  }
  if (!payload) {
    throw new BookingApiError(500, "Сервис бронирования временно недоступен");
  }
  return payload;
}

export const bookingApi = {
  async create(input: BookingInput) {
    return requestJson<{ message: string; booking: BookingRequest }>("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        phone: input.phone,
        date: input.date,
        time: input.time,
        durationHours: input.durationHours,
        room: input.room,
        tariff: input.tariff,
        comment: input.comment,
        privacyConsent: input.privacyConsent,
      }),
    });
  },
  async mine() {
    const response = await requestJson<{ booking: BookingRequest | null }>("/api/bookings/mine");
    return response.booking;
  },
};

export const adminBookingApi = {
  async list() {
    const response = await requestJson<{ bookings: AdminBooking[] }>("/api/admin/bookings");
    return response.bookings;
  },
  async updateStatus(id: string, status: Exclude<BookingStatus, "pending">) {
    const response = await requestJson<{ booking: AdminBooking }>(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return response.booking;
  },
  delete(id: string) {
    return requestJson<{ message: string }>(`/api/admin/bookings/${id}`, {
      method: "DELETE",
    });
  },
  clear() {
    return requestJson<{ message: string; deletedCount: number }>("/api/admin/bookings", {
      method: "DELETE",
      body: JSON.stringify({ confirm: true }),
    });
  },
};
