export type NavigationItem = {
  label: string;
  path: "/" | `/${string}`;
};

export const siteConfig = {
  brand: {
    name: "99 AKTAU",
    shortName: "99 AKTAU",
    city: "Актау",
    logoSrc: "/brand/logo.png",
  },
  navigation: [
    { label: "Главная", path: "/" },
    { label: "О клубе", path: "/about" },
    { label: "Игровые зоны", path: "/zones" },
    { label: "Бронирование", path: "/booking" },
    { label: "Контакты", path: "/contacts" },
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
