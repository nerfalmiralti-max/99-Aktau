import {
  BOOKING_ROOMS as SHARED_BOOKING_ROOMS,
  BOOKING_TARIFFS as SHARED_BOOKING_TARIFFS,
  type BookingRoom,
  type BookingTariff,
} from "../../../shared/bookingPolicy.mjs";

export const BOOKING_ROOMS = SHARED_BOOKING_ROOMS;
export type { BookingRoom };

export const BOOKING_TARIFFS = SHARED_BOOKING_TARIFFS;
export type { BookingTariff };

export const BOOKING_STATUSES = ["pending", "accepted", "rejected"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_TARIFF_LABELS: Record<BookingTariff, string> = {
  hourly: "Почасовая бронь",
  promotion: "Акция 2+1",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Ожидает решения",
  accepted: "Принята",
  rejected: "Отклонена",
};

export type BookingInput = {
  name: string;
  phone: string;
  date: string;
  time: string;
  durationHours: number;
  room: BookingRoom;
  tariff: BookingTariff;
  comment: string;
  privacyConsent: boolean;
};

export type BookingRequest = Omit<BookingInput, "privacyConsent"> & {
  id: string;
  startAt: string;
  endAt: string;
  endDate: string;
  endTime: string;
  hourlyPrice: number;
  baseTotal: number;
  promotionDiscount: number;
  estimatedTotal: number;
  /** Compatibility alias for older API consumers. */
  price: number;
  status: BookingStatus;
  createdAt: string;
};

export type AdminBooking = BookingRequest;
