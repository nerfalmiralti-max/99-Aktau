import { BOOKING_ROOMS, type BookingRequest, type BookingRoom } from "./types";

export const BOOKING_RETENTION_MS = 24 * 60 * 60 * 1000;
export const MAX_ACTIVE_BOOKINGS_PER_PHONE = 2;

export class BookingLimitError extends Error {
  constructor() {
    super("Для одного номера телефона доступно не более двух активных бронирований.");
    this.name = "BookingLimitError";
  }
}

export function isBookingRoom(value: string): value is BookingRoom {
  return BOOKING_ROOMS.some((room) => room === value);
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits.length === 11 && digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
}

export function isActiveBooking(booking: BookingRequest, now = Date.now()) {
  const createdAt = Date.parse(booking.createdAt);

  return Number.isFinite(createdAt) && now - createdAt < BOOKING_RETENTION_MS;
}
