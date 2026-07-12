export const BOOKING_ROOMS = ["Основной зал", "VIP-зал"] as const;

export type BookingRoom = (typeof BOOKING_ROOMS)[number];

export const BOOKING_TARIFFS = ["hourly", "promotion"] as const;
export type BookingTariff = (typeof BOOKING_TARIFFS)[number];

export const BOOKING_STATUSES = ["pending", "accepted", "rejected"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_TARIFF_LABELS: Record<BookingTariff, string> = {
  hourly: "Почасовая бронь",
  promotion: "Акция 2+1",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Ожидает",
  accepted: "Принята",
  rejected: "Отклонена",
};

export function getBookingPrice(room: BookingRoom, tariff: BookingTariff) {
  if (tariff === "promotion") {
    return room === "VIP-зал" ? 3500 : 2000;
  }
  return room === "VIP-зал" ? 1500 : 1000;
}

export type BookingInput = {
  name: string;
  phone: string;
  date: string;
  time: string;
  room: BookingRoom;
  tariff: BookingTariff;
  comment: string;
  privacyConsent: boolean;
};

export type BookingRequest = Omit<BookingInput, "privacyConsent"> & {
  id: string;
  price: number;
  status: BookingStatus;
  createdAt: string;
};

export type AdminBooking = BookingRequest;

export type BookingRepository = {
  create(input: BookingInput): Promise<BookingRequest>;
  list(): Promise<BookingRequest[]>;
  clear?(): Promise<void>;
};

export type BookingRepositoryMode = "local" | "supabase";
