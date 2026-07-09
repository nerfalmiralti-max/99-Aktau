import { Armchair, CalendarCheck, DoorOpen, Gamepad2, Gem, Headphones } from "lucide-react";
import { siteConfig } from "../config/site.config";

export const aboutCards = [
  {
    title: "Lounge вместо шумного зала",
    text: "Пространство собрано вокруг спокойной атмосферы, мягкого света и ощущения приватного вечера.",
    icon: Gem,
  },
  {
    title: "Консольный отдых без хаоса",
    text: "Фокус на удобной посадке, чистой визуальной среде и понятном сценарии визита для гостей.",
    icon: Gamepad2,
  },
  {
    title: "Заявка за минуту",
    text: "Гость выбирает дату и время, оставляет контакт, а владелец получает готовую структуру для подключения CRM.",
    icon: CalendarCheck,
  },
];

export const zoneCards = [
  {
    title: "Основной lounge",
    text: "Открытый формат для спокойной игры и отдыха компании в общем пространстве клуба.",
    icon: Armchair,
  },
  {
    title: "Private-зона",
    text: "Более уединенный сценарий для гостей, которым важны приватность, звук и сфокусированная атмосфера.",
    icon: DoorOpen,
  },
  {
    title: "Формат для компании",
    text: "Гибкая посадка для визита с друзьями без указания выдуманной вместимости или тарифов.",
    icon: Headphones,
  },
];

export const galleryImages = [
  {
    src: siteConfig.media.hero,
    title: "Главный зал",
    alt: "Главный зал 99 AKTAU",
    width: 1983,
    height: 793,
  },
  {
    src: siteConfig.media.zone,
    title: "Private-зона",
    alt: "Private-зона 99 AKTAU",
    width: 1672,
    height: 941,
  },
  {
    src: siteConfig.media.detail,
    title: "Детали пространства",
    alt: "Детали игрового пространства 99 AKTAU",
    width: 1536,
    height: 1024,
  },
  {
    src: siteConfig.media.lounge,
    title: "Lounge-пространство",
    alt: "Lounge-пространство 99 AKTAU",
    width: 1672,
    height: 941,
  },
];
