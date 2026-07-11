import { siteConfig } from "../../config/site.config";
import { BrandLogo } from "../brand/BrandLogo";
import { Link } from "react-router-dom";
import {
  createInstagramHref,
  createTelHref,
  createWhatsAppHref,
} from "../../utils/linkUtils";

export function Footer() {
  const { contacts } = siteConfig;

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <Link className="brand-mark footer-brand" to="/">
          <BrandLogo />
        </Link>

        <nav className="footer-nav" aria-label="Навигация в футере">
          {siteConfig.navigation.map((item) => (
            <Link to={item.path} key={item.path}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="footer-contacts" aria-label="Контакты">
          {contacts.phone ? <a href={createTelHref(contacts.phone)}>{contacts.phone}</a> : null}
          {contacts.whatsapp ? (
            <a href={createWhatsAppHref(contacts.whatsapp)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : null}
          {contacts.instagram ? (
            <a
              href={contacts.instagramUrl ?? createInstagramHref(contacts.instagram)}
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
          ) : null}
          <span>{contacts.address ?? siteConfig.brand.city}</span>
        </div>
      </div>
    </footer>
  );
}
