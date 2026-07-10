export const BOOKING_ROOMS = ["Основной зал", "VIP-зал"] as const;

export type BookingRoom = (typeof BOOKING_ROOMS)[number];

export type BookingInput = {
  name: string;
  phone: string;
  date: string;
  time: string;
  room: BookingRoom;
  comment: string;
};

export type BookingRequest = BookingInput & {
  id: string;
  createdAt: string;
};

export type BookingRepository = {
  create(input: BookingInput): Promise<BookingRequest>;
  list(): Promise<BookingRequest[]>;
  clear?(): Promise<void>;
};

export type BookingRepositoryMode = "local" | "supabase";
