import { createClient } from "@supabase/supabase-js";
import type { BookingInput, BookingRepository, BookingRequest } from "./types";

type BookingRow = {
  id: string;
  name: string;
  phone: string;
  booking_date: string;
  booking_time: string;
  comment: string | null;
  created_at: string;
};

const SELECT_COLUMNS = "id,name,phone,booking_date,booking_time,comment,created_at";

function mapRow(row: BookingRow): BookingRequest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    date: row.booking_date,
    time: row.booking_time.slice(0, 5),
    comment: row.comment ?? "",
    createdAt: row.created_at,
  };
}

export function createSupabaseBookingRepository(
  supabaseUrl: string,
  supabaseAnonKey: string,
): BookingRepository {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  return {
    async create(input: BookingInput) {
      const { data, error } = await client
        .from("bookings")
        .insert({
          name: input.name,
          phone: input.phone,
          booking_date: input.date,
          booking_time: input.time,
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
      const { data, error } = await client
        .from("bookings")
        .select(SELECT_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<BookingRow[]>();

      if (error) {
        throw error;
      }

      return data.map(mapRow);
    },
  };
}
