import { createClient } from "@supabase/supabase-js";
import {
  BookingLimitError,
  BOOKING_RETENTION_MS,
  isBookingRoom,
  MAX_ACTIVE_BOOKINGS_PER_PHONE,
  normalizePhone,
} from "./bookingRules";
import { BOOKING_ROOMS, BOOKING_TARIFFS, BOOKING_STATUSES } from "./types";
import type { BookingInput, BookingRepository, BookingRequest } from "./types";

type BookingRow = {
  id: string;
  name: string;
  phone: string;
  booking_date: string;
  booking_time: string;
  room: string;
  tariff_type: string;
  price: number;
  comment: string | null;
  status: string;
  created_at: string;
};

const SELECT_COLUMNS = "id,name,phone,booking_date,booking_time,room,tariff_type,price,comment,status,created_at";

function mapRow(row: BookingRow): BookingRequest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    date: row.booking_date,
    time: row.booking_time.slice(0, 5),
    room: isBookingRoom(row.room) ? row.room : BOOKING_ROOMS[0],
    tariff: BOOKING_TARIFFS.includes(row.tariff_type as (typeof BOOKING_TARIFFS)[number])
      ? row.tariff_type as (typeof BOOKING_TARIFFS)[number]
      : BOOKING_TARIFFS[0],
    price: Number(row.price),
    comment: row.comment ?? "",
    status: BOOKING_STATUSES.includes(row.status as (typeof BOOKING_STATUSES)[number])
      ? row.status as (typeof BOOKING_STATUSES)[number]
      : BOOKING_STATUSES[0],
    createdAt: row.created_at,
  };
}

export function createSupabaseBookingRepository(
  supabaseUrl: string,
  supabaseAnonKey: string,
): BookingRepository {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  const getExpirationCutoff = () => new Date(Date.now() - BOOKING_RETENTION_MS).toISOString();

  const purgeExpiredBookings = async () => {
    const { error } = await client
      .from("bookings")
      .delete()
      .lte("created_at", getExpirationCutoff());

    if (error) {
      throw error;
    }
  };

  const listActiveBookings = async () => {
    await purgeExpiredBookings();

    const { data, error } = await client
      .from("bookings")
      .select(SELECT_COLUMNS)
      .gt("created_at", getExpirationCutoff())
      .order("created_at", { ascending: false })
      .returns<BookingRow[]>();

    if (error) {
      throw error;
    }

    return data.map(mapRow);
  };

  return {
    async create(input: BookingInput) {
      const activeBookings = await listActiveBookings();
      const normalizedPhone = normalizePhone(input.phone);
      const activeBookingCount = activeBookings.filter(
        (booking) => normalizePhone(booking.phone) === normalizedPhone,
      ).length;

      if (activeBookingCount >= MAX_ACTIVE_BOOKINGS_PER_PHONE) {
        throw new BookingLimitError();
      }

      const { data, error } = await client
        .from("bookings")
        .insert({
          name: input.name,
          phone: input.phone,
          booking_date: input.date,
          booking_time: input.time,
          room: input.room,
          tariff_type: input.tariff,
          price: input.room === "VIP-зал"
            ? input.tariff === "promotion" ? 3500 : 1500
            : input.tariff === "promotion" ? 2000 : 1000,
          comment: input.comment || null,
          status: "pending",
        })
        .select(SELECT_COLUMNS)
        .single<BookingRow>();

      if (error) {
        throw error;
      }

      return mapRow(data);
    },

    async list() {
      return listActiveBookings();
    },
  };
}
