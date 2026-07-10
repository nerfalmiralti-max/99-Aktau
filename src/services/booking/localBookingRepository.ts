import type { BookingInput, BookingRepository, BookingRequest } from "./types";
import {
  BookingLimitError,
  isActiveBooking,
  isBookingRoom,
  MAX_ACTIVE_BOOKINGS_PER_PHONE,
  normalizePhone,
} from "./bookingRules";
import { BOOKING_ROOMS } from "./types";

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
    if (!Array.isArray(parsed)) {
      return [];
    }

    const activeBookings = (parsed as BookingRequest[])
      .map((booking) => ({
        ...booking,
        room: isBookingRoom(booking.room) ? booking.room : BOOKING_ROOMS[0],
      }))
      .filter((booking) => isActiveBooking(booking));

    writeBookings(activeBookings);

    return activeBookings;
  } catch {
    return [];
  }
}

function writeBookings(bookings: BookingRequest[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export const localBookingRepository: BookingRepository = {
  async create(input: BookingInput) {
    const bookings = readBookings();
    const normalizedPhone = normalizePhone(input.phone);
    const activeBookingCount = bookings.filter(
      (booking) => normalizePhone(booking.phone) === normalizedPhone,
    ).length;

    if (activeBookingCount >= MAX_ACTIVE_BOOKINGS_PER_PHONE) {
      throw new BookingLimitError();
    }

    const booking: BookingRequest = {
      ...input,
      id: createId(),
      createdAt: new Date().toISOString(),
    };

    const updatedBookings = [booking, ...bookings].slice(0, MAX_STORED_BOOKINGS);
    writeBookings(updatedBookings);

    return booking;
  },

  async list() {
    return readBookings();
  },

  async clear() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
