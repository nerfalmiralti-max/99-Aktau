import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Loader2, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { BrandLogo } from "../brand/BrandLogo";
import { siteConfig } from "../../config/site.config";
import { ButtonLink } from "../ui/Button";

type AdminState = "loading" | "guest" | "admin";

type NavbarProps = {
  adminState: AdminState;
  onAdminLogin: () => void;
  onAdminLogout: () => void;
};

type AdminNavigationControlProps = NavbarProps & {
  isMobile?: boolean;
};

function AdminNavigationControl({
  adminState,
  isMobile = false,
  onAdminLogin,
  onAdminLogout,
}: AdminNavigationControlProps) {
  const className = isMobile ? "admin-nav-control is-mobile" : "admin-nav-control";

  if (adminState === "loading") {
    return (
      <button className={`${className} admin-nav-entry`} disabled type="button">
        <Loader2 className="spin" aria-hidden size={15} />
        <span>Проверяем вход</span>
      </button>
    );
  }
  if (adminState === "guest") {
    return (
      <button className={`${className} admin-nav-entry`} onClick={onAdminLogin} type="button">
        <ShieldCheck aria-hidden size={15} />
        <span>Вход для администратора</span>
      </button>
    );
  }
  return (
    <div className={`${className} admin-nav-state`}>
      <span><ShieldCheck aria-hidden size={15} />Режим администратора</span>
      <button onClick={onAdminLogout} type="button">
        <LogOut aria-hidden size={15} />
        <span>Выйти</span>
      </button>
    </div>
  );
}

export function Navbar({ adminState, onAdminLogin, onAdminLogout }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
  const openAdminLogin = () => {
    closeMenu();
    onAdminLogin();
  };
  const logoutAdmin = () => {
    closeMenu();
    onAdminLogout();
  };

  return (
    <motion.header
      className={`site-nav ${isScrolled ? "is-scrolled" : ""}`}
      initial={{ x: "-50%", y: -24, opacity: 0 }}
      animate={{ x: "-50%", y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Link className="brand-mark" to="/" onClick={closeMenu}>
        <BrandLogo />
      </Link>

      <nav className="desktop-nav" aria-label="Основная навигация">
        {siteConfig.navigation.map((item) => (
          <NavLink
            className={({ isActive }) => isActive ? "is-active" : ""}
            end={item.path === "/"}
            to={item.path}
            key={item.path}
          >
            {item.label}
          </NavLink>
        ))}
        <AdminNavigationControl
          adminState={adminState}
          onAdminLogin={openAdminLogin}
          onAdminLogout={logoutAdmin}
        />
      </nav>

      <ButtonLink
        className="nav-cta"
        to="/booking"
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
            <Link className="mobile-nav-brand" to="/" onClick={closeMenu}>
              <BrandLogo />
            </Link>
            {siteConfig.navigation.map((item) => (
              <NavLink
                className={({ isActive }) => isActive ? "is-active" : ""}
                end={item.path === "/"}
                to={item.path}
                key={item.path}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
            <AdminNavigationControl
              adminState={adminState}
              isMobile
              onAdminLogin={openAdminLogin}
              onAdminLogout={logoutAdmin}
            />
            <ButtonLink
              className="mobile-nav-cta"
              to="/booking"
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
