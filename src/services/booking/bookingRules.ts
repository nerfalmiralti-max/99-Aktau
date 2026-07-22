export {
  calculateBookingQuote,
  HOURLY_PRICES,
  isValidDurationHours,
  MAX_DURATION_HOURS,
  MIN_DURATION_HOURS,
} from "../../../shared/bookingPolicy.mjs";

export function formatDurationHours(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${value} часов`;
  }
  if (last === 1) {
    return `${value} час`;
  }
  if (last >= 2 && last <= 4) {
    return `${value} часа`;
  }
  return `${value} часов`;
}
