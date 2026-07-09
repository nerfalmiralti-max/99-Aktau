export type BookingInput = {
  name: string;
  phone: string;
  date: string;
  time: string;
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
