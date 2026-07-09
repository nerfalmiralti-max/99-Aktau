import type { BookingInput, BookingRepository, BookingRequest } from "./types";

const STORAGE_KEY = "99-aktau-bookings";
const MAX_STORED_BOOKINGS = 30;

function createId() {
  if ("crypto" in window && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readBookings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as BookingRequest[]) : [];
  } catch {
    return [];
  }
}

function writeBookings(bookings: BookingRequest[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export const localBookingRepository: BookingRepository = {
  async create(input: BookingInput) {
    const booking: BookingRequest = {
      ...input,
      id: createId(),
      createdAt: new Date().toISOString(),
    };

    const bookings = [booking, ...readBookings()].slice(0, MAX_STORED_BOOKINGS);
    writeBookings(bookings);

    return booking;
  },

  async list() {
    return readBookings();
  },

  async clear() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
