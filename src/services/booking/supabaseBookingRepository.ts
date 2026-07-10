import { createClient } from "@supabase/supabase-js";
import {
  BookingLimitError,
  BOOKING_RETENTION_MS,
  isBookingRoom,
  MAX_ACTIVE_BOOKINGS_PER_PHONE,
  normalizePhone,
} from "./bookingRules";
import { BOOKING_ROOMS } from "./types";
import type { BookingInput, BookingRepository, BookingRequest } from "./types";

type BookingRow = {
  id: string;
  name: string;
  phone: string;
  booking_date: string;
  booking_time: string;
  room: string;
  comment: string | null;
  created_at: string;
};

const SELECT_COLUMNS = "id,name,phone,booking_date,booking_time,room,comment,created_at";

function mapRow(row: BookingRow): BookingRequest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    date: row.booking_date,
    time: row.booking_time.slice(0, 5),
    room: isBookingRoom(row.room) ? row.room : BOOKING_ROOMS[0],
    comment: row.comment ?? "",
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
          comment: input.comment || null,
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
