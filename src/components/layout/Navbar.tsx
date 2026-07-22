"use client";

import { Loader2, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { siteConfig } from "../../config/site.config";
import { BrandLogo } from "../brand/BrandLogo";

type AdminState = "loading" | "guest" | "admin";

type NavbarProps = {
  adminState: AdminState;
  onAdminLogin: () => void;
  onAdminLogout: () => void;
};

function AdminNavigationControl({ adminState, onAdminLogin, onAdminLogout }: NavbarProps) {
  if (adminState === "loading") {
    return (
      <button
        aria-label="Проверяем статус администратора"
        className="admin-nav-control admin-nav-entry"
        disabled
        type="button"
      >
        <Loader2 className="spin" aria-hidden size={15} />
        <span>Проверяем вход</span>
      </button>
    );
  }

  if (adminState === "guest") {
    return (
      <button className="admin-nav-control admin-nav-entry" onClick={onAdminLogin} type="button">
        <ShieldCheck aria-hidden size={15} />
        <span>Вход для администратора</span>
      </button>
    );
  }

  return (
    <div className="admin-nav-control admin-nav-state">
      <span>
        <ShieldCheck aria-hidden size={15} />
        Режим администратора
      </span>
      <button onClick={onAdminLogout} type="button">
        <LogOut aria-hidden size={15} />
        <span>Выйти</span>
      </button>
    </div>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {siteConfig.navigation.map((item) => (
        <NavLink
          className={({ isActive }) => `site-nav__link${isActive ? " is-active" : ""}`}
          end={item.path === "/"}
          key={item.path}
          onClick={onNavigate}
          to={item.path}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export function Navbar({ adminState, onAdminLogin, onAdminLogout }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isScrolledRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const focusMenuOnOpenRef = useRef(false);

  useEffect(() => {
    const syncScrolledState = () => {
      frameRef.current = null;
      const nextIsScrolled = window.scrollY > 24;
      if (nextIsScrolled !== isScrolledRef.current) {
        isScrolledRef.current = nextIsScrolled;
        setIsScrolled(nextIsScrolled);
      }
    };

    const handleScroll = () => {
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(syncScrolledState);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    document.body.classList.add("has-open-menu");
    const pageRegions = [document.querySelector("main"), document.querySelector("footer")]
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
    pageRegions.forEach((element) => element.setAttribute("inert", ""));

    if (focusMenuOnOpenRef.current) {
      focusMenuOnOpenRef.current = false;
      mobileNavRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuToggleRef.current?.focus();
        return;
      }
      if (event.key === "Tab" && headerRef.current) {
        const focusable = Array.from(headerRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), [tabindex]:not([tabindex='-1'])",
        )).filter((element) => element.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (first && last && event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (first && last && !event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const desktopMedia = window.matchMedia("(min-width: 901px)");
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    desktopMedia.addEventListener("change", handleDesktopChange);

    return () => {
      document.body.classList.remove("has-open-menu");
      pageRegions.forEach((element) => element.removeAttribute("inert"));
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      desktopMedia.removeEventListener("change", handleDesktopChange);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  const handleAdminLogin = () => {
    closeMenu();
    onAdminLogin();
  };

  const handleAdminLogout = () => {
    closeMenu();
    onAdminLogout();
  };

  return (
    <header
      className={`site-header${isScrolled ? " is-scrolled" : ""}${isMenuOpen ? " is-menu-open" : ""}`}
      ref={headerRef}
    >
      <div className="site-header__inner container">
        <NavLink aria-label={`${siteConfig.brand.name} — на главную`} className="site-header__brand" to="/">
          <BrandLogo />
        </NavLink>

        <nav aria-label="Основная навигация" className="site-nav site-nav--desktop">
          <NavigationLinks />
        </nav>

        <div className="site-header__actions">
          <div className="site-header__admin site-header__admin--desktop">
            <AdminNavigationControl
              adminState={adminState}
              onAdminLogin={handleAdminLogin}
              onAdminLogout={handleAdminLogout}
            />
          </div>

          <button
            aria-controls="mobile-site-menu"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
            className="mobile-menu-toggle"
            onClick={(event) => {
              focusMenuOnOpenRef.current = !isMenuOpen && event.detail === 0;
              setIsMenuOpen((current) => !current);
            }}
            ref={menuToggleRef}
            type="button"
          >
            {isMenuOpen ? <X aria-hidden size={22} /> : <Menu aria-hidden size={22} />}
          </button>
        </div>
      </div>

      <div className="mobile-menu" id="mobile-site-menu" hidden={!isMenuOpen}>
        <nav aria-label="Мобильная навигация" className="site-nav site-nav--mobile" ref={mobileNavRef}>
          <NavigationLinks onNavigate={closeMenu} />
        </nav>
        <div className="mobile-menu__admin">
          <AdminNavigationControl
            adminState={adminState}
            onAdminLogin={handleAdminLogin}
            onAdminLogout={handleAdminLogout}
          />
        </div>
      </div>
    </header>
  );
}
