export type NavigationItem = {
  label: string;
  href: `#${string}`;
  sectionId: string;
};

export const siteConfig = {
  brand: {
    name: "99 AKTAU",
    shortName: "99 AKTAU",
    city: "Актау",
    logoSrc: "/brand/logo.png",
  },
  navigation: [
    { label: "Главная", href: "#home", sectionId: "home" },
    { label: "О клубе", href: "#about", sectionId: "about" },
    { label: "Игровые зоны", href: "#zones", sectionId: "zones" },
    { label: "Галерея", href: "#gallery", sectionId: "gallery" },
    { label: "Бронирование", href: "#booking", sectionId: "booking" },
    { label: "Контакты", href: "#contacts", sectionId: "contacts" },
  ] satisfies NavigationItem[],
  media: {
    hero: "/images/optimized/hero-lounge.jpg",
    zone: "/images/optimized/zone-private.jpg",
    detail: "/images/optimized/gallery-detail.jpg",
    lounge: "/images/optimized/gallery-lounge.jpg",
  },
  contacts: {
    phone: null as string | null,
    whatsapp: null as string | null,
    instagram: null as string | null,
    address: "28-й микрорайон, 68/3, ЖК «Империя», Актау",
    mapQuery: "28-й микрорайон, 68/3, ЖК Империя, Актау",
  },
};
