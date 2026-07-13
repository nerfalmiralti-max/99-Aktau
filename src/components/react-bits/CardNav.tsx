"use client";

import {
  ArrowUpRight,
  AtSign,
  CalendarCheck,
  ChevronRight,
  Gamepad2,
  Home,
  Info,
  MapPin,
  MessageCircle,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BrandLogo } from "../brand/BrandLogo";
import "./CardNav.css";

type InternalCardNavLink = {
  label: string;
  path: string;
};

type ExternalCardNavLink = {
  ariaLabel: string;
  href: string;
  label: string;
};

export type CardNavLink = InternalCardNavLink | ExternalCardNavLink;

export type CardNavItem = {
  bgColor: string;
  label: string;
  links: CardNavLink[];
  textColor: string;
};

type CardNavProps = {
  adminControl: ReactNode;
  className?: string;
  isScrolled: boolean;
  items: CardNavItem[];
};

function getMobileLinkIcon(link: CardNavLink): LucideIcon {
  if ("href" in link) {
    return link.label.toLowerCase().includes("whatsapp") ? MessageCircle : AtSign;
  }
  if (link.path === "/") return Home;
  if (link.path.startsWith("/about")) return Info;
  if (link.path.startsWith("/zones#promotion")) return Sparkles;
  if (link.path.startsWith("/zones#tariffs")) return Tag;
  if (link.path.startsWith("/zones")) return Gamepad2;
  if (link.path.startsWith("/booking")) return CalendarCheck;
  if (link.path.startsWith("/contacts")) return MapPin;
  return ChevronRight;
}

export function CardNav({
  adminControl,
  className = "",
  isScrolled,
  items,
}: CardNavProps) {
  const { hash, pathname } = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousPathRef = useRef(pathname);

  const closeMenu = useCallback((restoreFocus = true) => {
    if (!isExpanded) {
      if (restoreFocus) menuButtonRef.current?.focus();
      return;
    }
    setIsExpanded(false);
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, [isExpanded]);

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      if (isExpanded) {
        const frame = requestAnimationFrame(() => closeMenu(true));
        return () => cancelAnimationFrame(frame);
      }
    }
  }, [closeMenu, isExpanded, pathname]);

  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, pathname]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 980px)");
    const syncBodyLock = () => {
      document.body.classList.toggle("has-open-menu", isExpanded && media.matches);
    };
    syncBodyLock();
    media.addEventListener("change", syncBodyLock);

    return () => {
      media.removeEventListener("change", syncBodyLock);
      document.body.classList.remove("has-open-menu");
    };
  }, [isExpanded]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (isExpanded && navRef.current && !navRef.current.contains(event.target as Node)) {
        closeMenu(true);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isExpanded]);

  const toggleMenu = () => {
    if (isExpanded) {
      closeMenu(true);
      return;
    }
    setIsExpanded(true);
  };

  return (
    <header className={`card-nav-container ${className}`.trim()}>
      <nav
        className={`card-nav ${isExpanded ? "is-open" : ""} ${isScrolled ? "is-scrolled" : ""}`}
        ref={navRef}
        aria-label="Основная навигация"
      >
        <div className="card-nav-top">
          <button
            aria-controls={contentId}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Закрыть меню" : "Открыть меню"}
            className={`card-nav-menu-button ${isExpanded ? "is-open" : ""}`}
            onClick={toggleMenu}
            ref={menuButtonRef}
            type="button"
          >
            <span />
            <span />
          </button>

          <Link className="card-nav-brand" onClick={() => closeMenu(true)} to="/">
            <BrandLogo />
          </Link>

          <Link
            className="button button-primary card-nav-cta"
            onClick={() => closeMenu(true)}
            to="/booking"
          >
            <span>Забронировать</span>
            <CalendarCheck aria-hidden size={16} />
          </Link>
        </div>

        <div
          aria-hidden={!isExpanded}
          className="card-nav-content"
          id={contentId}
          inert={!isExpanded}
        >
          {items.map((item, index) => (
            <section
              className="card-nav-card"
              key={item.label}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <span className="card-nav-card-label">{item.label}</span>
              <div className="card-nav-links">
                {item.links.map((link) => {
                  const MobileIcon = getMobileLinkIcon(link);
                  if ("href" in link) {
                    return (
                      <a
                        aria-label={link.ariaLabel}
                        className="card-nav-link"
                        href={link.href}
                        key={link.href}
                        onClick={() => closeMenu(true)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <MobileIcon aria-hidden className="card-nav-link-icon" size={16} />
                        <span className="card-nav-link-label">{link.label}</span>
                        <ArrowUpRight aria-hidden className="card-nav-link-arrow" size={16} />
                      </a>
                    );
                  }

                  const hashTarget = link.path.includes("#")
                    ? `#${link.path.split("#")[1]}`
                    : "";
                  return (
                    <NavLink
                      className={({ isActive }) => (
                        `card-nav-link ${
                          isActive && (hashTarget ? hash === hashTarget : !hash) ? "is-active" : ""
                        }`.trim()
                      )}
                      end={link.path === "/"}
                      key={link.path}
                      onClick={() => closeMenu(true)}
                      to={link.path}
                    >
                      <MobileIcon aria-hidden className="card-nav-link-icon" size={16} />
                      <span className="card-nav-link-label">{link.label}</span>
                      <ChevronRight aria-hidden className="card-nav-link-arrow" size={16} />
                    </NavLink>
                  );
                })}
                {index === items.length - 1 ? (
                  <div className="card-nav-admin-slot" onClick={() => closeMenu(true)}>
                    {adminControl}
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </nav>
    </header>
  );
}
