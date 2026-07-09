import { localBookingRepository } from "./localBookingRepository";
import { createSupabaseBookingRepository } from "./supabaseBookingRepository";
import type { BookingRepositoryMode } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const bookingRepositoryMode: BookingRepositoryMode =
  supabaseUrl && supabaseAnonKey ? "supabase" : "local";

export const bookingRepository =
  bookingRepositoryMode === "supabase"
    ? createSupabaseBookingRepository(supabaseUrl!, supabaseAnonKey!)
    : localBookingRepository;
