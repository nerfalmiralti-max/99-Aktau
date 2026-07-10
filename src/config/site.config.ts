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
    { label: "Бронирование", href: "#booking", sectionId: "booking" },
    { label: "Контакты", href: "#contacts", sectionId: "contacts" },
  ] satisfies NavigationItem[],
  contacts: {
    phone: "+7 701 081 54 95",
    whatsapp: "+7 701 081 54 95",
    instagram: "@99.aktau",
    instagramUrl: "https://www.instagram.com/99.aktau?igsh=ZGV2eDZseWl4ZGNt",
    address: "28-й микрорайон, 68/3, ЖК «Империя», Актау",
    mapQuery: "28-й микрорайон, 68/3, ЖК Империя, Актау",
  },
};
