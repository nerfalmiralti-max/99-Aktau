export function normalizePhone(value: string) {
  const hasPlus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "");

  return `${hasPlus ? "+" : ""}${digits}`;
}

export function createTelHref(phone: string) {
  return `tel:${normalizePhone(phone)}`;
}

export function createWhatsAppHref(value: string) {
  const digits = value.replace(/\D/g, "");

  return `https://wa.me/${digits}`;
}

export function createInstagramHref(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://www.instagram.com/${value.replace(/^@/, "")}`;
}

export function createMapsSearchHref(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function createMapsEmbedHref(query: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}
