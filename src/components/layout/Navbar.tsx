import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "../brand/BrandLogo";
import { siteConfig } from "../../config/site.config";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import { ButtonLink } from "../ui/Button";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sectionIds = useMemo(
    () => siteConfig.navigation.map((item) => item.sectionId),
    [],
  );
  const activeSection = useScrollSpy(sectionIds);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("has-open-menu", isMenuOpen);

    return () => document.body.classList.remove("has-open-menu");
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <motion.header
      className={`site-nav ${isScrolled ? "is-scrolled" : ""}`}
      initial={{ x: "-50%", y: -24, opacity: 0 }}
      animate={{ x: "-50%", y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <a className="brand-mark" href="#home" onClick={closeMenu}>
        <BrandLogo />
      </a>

      <nav className="desktop-nav" aria-label="Основная навигация">
        {siteConfig.navigation.map((item) => (
          <a
            className={activeSection === item.sectionId ? "is-active" : ""}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <ButtonLink
        className="nav-cta"
        href="#booking"
        icon={<CalendarCheck aria-hidden size={16} />}
        onClick={closeMenu}
      >
        Бронь
      </ButtonLink>

      <button
        className="nav-menu-button"
        type="button"
        aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((value) => !value)}
      >
        {isMenuOpen ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
      </button>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.nav
            className="mobile-nav"
            aria-label="Мобильная навигация"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <a className="mobile-nav-brand" href="#home" onClick={closeMenu}>
              <BrandLogo />
            </a>
            {siteConfig.navigation.map((item) => (
              <a
                className={activeSection === item.sectionId ? "is-active" : ""}
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
            <ButtonLink
              className="mobile-nav-cta"
              href="#booking"
              icon={<CalendarCheck aria-hidden size={16} />}
              onClick={closeMenu}
            >
              Забронировать
            </ButtonLink>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
