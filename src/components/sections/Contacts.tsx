import { AtSign, ExternalLink, MapPinned, MapPin, MessageCircle, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { siteConfig } from "../../config/site.config";
import {
  createInstagramHref,
  createMapsEmbedHref,
  createMapsSearchHref,
  createTelHref,
  createWhatsAppHref,
} from "../../utils/linkUtils";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";

type ContactCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | null;
  href?: string;
};

function ContactCard({ icon: Icon, label, value, href }: ContactCardProps) {
  const content = (
    <>
      <span className="contact-icon">
        <Icon aria-hidden size={21} />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value ?? "Будет добавлено"}</strong>
      </span>
      {href ? <ExternalLink aria-hidden className="contact-external" size={16} /> : null}
    </>
  );

  if (!href || !value) {
    return <div className="contact-card is-muted">{content}</div>;
  }

  const isExternal = href.startsWith("http");

  return (
    <a
      className="contact-card"
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
    >
      {content}
    </a>
  );
}

export function Contacts() {
  const { contacts } = siteConfig;
  const mapQuery = contacts.address ?? contacts.mapQuery;

  return (
    <section className="section contacts-section" id="contacts">
      <div className="container">
        <SectionHeader
          eyebrow="Контакты"
          title="Адрес, связь и маршрут без лишних шагов."
          text="Все контакты 99 AKTAU хранятся в одном конфиге, поэтому сайт готов к подключению реальных телефона, WhatsApp и Instagram."
        />

        <div className="contacts-layout">
          <Reveal className="contacts-list">
            <ContactCard
              icon={Phone}
              label="Телефон"
              value={contacts.phone}
              href={contacts.phone ? createTelHref(contacts.phone) : undefined}
            />
            <ContactCard
              icon={MessageCircle}
              label="WhatsApp"
              value={contacts.whatsapp}
              href={contacts.whatsapp ? createWhatsAppHref(contacts.whatsapp) : undefined}
            />
            <ContactCard
              icon={AtSign}
              label="Instagram"
              value={contacts.instagram}
              href={contacts.instagram ? createInstagramHref(contacts.instagram) : undefined}
            />
            <ContactCard
              icon={MapPin}
              label="Адрес"
              value={contacts.address ?? siteConfig.brand.city}
              href={createMapsSearchHref(mapQuery)}
            />
            <ContactCard
              icon={MapPinned}
              label="Google Maps"
              value="Открыть карту"
              href={createMapsSearchHref(mapQuery)}
            />
          </Reveal>

          <Reveal className="map-card" delay={0.1}>
            <iframe
              title={`Карта ${siteConfig.brand.name}`}
              src={createMapsEmbedHref(mapQuery)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
