import { formatBookingDate } from "./dateUtils";

export function formatPrice(value: number) {
  return `${value.toLocaleString("ru-RU")} ₸`;
}

export function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Aqtau",
  }).format(new Date(value));
}

export function formatBookingEnd(date: string, endDate: string, endTime: string) {
  return date === endDate ? endTime : `${formatBookingDate(endDate)}, ${endTime}`;
}
