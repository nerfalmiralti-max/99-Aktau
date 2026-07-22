export const MIN_DURATION_HOURS: 1;
export const MAX_DURATION_HOURS: 12;
export const MAX_ACTIVE_BOOKINGS_PER_PHONE: 1;
export const AKTAU_UTC_OFFSET: "+05:00";

export const BOOKING_ROOMS: readonly ["Основной зал", "VIP-зал"];
export type BookingRoom = (typeof BOOKING_ROOMS)[number];

export const BOOKING_TARIFFS: readonly ["hourly", "promotion"];
export type BookingTariff = (typeof BOOKING_TARIFFS)[number];

export const HOURLY_PRICES: Readonly<Record<BookingRoom, number>>;
export const PROMOTION_PRICES: Readonly<Record<BookingRoom, number>>;
export interface BookingInterval {
  startAt: string;
  endAt: string;
  endDate: string;
  endTime: string;
  crossesMidnight: boolean;
}

export interface BookingQuote extends BookingInterval {
  hourlyPrice: number;
  baseTotal: number;
  promotionDiscount: number;
  estimatedTotal: number;
}

export type DateTimeValue = string | number | Date;

export function isValidDurationHours(value: unknown): value is number;
export function calculateBookingInterval(
  date: string,
  time: string,
  durationHours: number,
): BookingInterval;
export function calculateBookingQuote(
  room: BookingRoom,
  tariff: BookingTariff,
  durationHours: number,
  date: string,
  time: string,
): BookingQuote;
export function intervalsOverlap(
  startA: DateTimeValue,
  endA: DateTimeValue,
  startB: DateTimeValue,
  endB: DateTimeValue,
): boolean;
