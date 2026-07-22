import { Armchair, CalendarCheck, CircleCheck, DoorOpen, Gamepad2 } from "lucide-react";

export const aboutCards = [
  {
    title: "Два зала на выбор",
    text: "Основной зал — 1 000 ₸ в час, VIP-зал — 1 500 ₸ в час. У каждого зала своя цена, указанная до бронирования.",
    icon: Gamepad2,
  },
  {
    title: "Заявка онлайн",
    text: "Укажите зал, дату, время, продолжительность и контактные данные — итоговая стоимость рассчитывается сразу.",
    icon: CalendarCheck,
  },
  {
    title: "Статус бронирования",
    text: "После отправки заявки её актуальный статус остаётся доступен на сайте.",
    icon: CircleCheck,
  },
];

export const zoneCards = [
  {
    title: "Основной зал",
    price: "1 000 ₸",
    priceUnit: "за час",
    promotion: "Акция 2+1 — 2 000 ₸ за три часа",
    bookingRoom: "main",
    icon: Armchair,
  },
  {
    title: "VIP-зал",
    price: "1 500 ₸",
    priceUnit: "за час",
    promotion: "Акция 2+1 — 3 500 ₸ за три часа",
    bookingRoom: "vip",
    icon: DoorOpen,
  },
];
