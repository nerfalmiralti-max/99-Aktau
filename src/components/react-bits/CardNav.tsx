"use client";

import { gsap } from "gsap";
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
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  ease?: string;
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
  ease = "power3.out",
  isScrolled,
  items,
}: CardNavProps) {
  const { hash, pathname } = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLElement[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const previousPathRef = useRef(pathname);

  const collapsedHeight = useCallback(() => {
    if (window.matchMedia("(max-width: 480px)").matches) {
      return 58;
    }
    return window.matchMedia("(max-width: 980px)").matches ? 66 : 70;
  }, []);

  const calculateHeight = useCallback(() => {
    const content = contentRef.current;
    if (!content) {
      return collapsedHeight();
    }

    const previousPosition = content.style.position;
    const previousVisibility = content.style.visibility;
    const previousPointerEvents = content.style.pointerEvents;
    content.style.position = "static";
    content.style.visibility = "visible";
    content.style.pointerEvents = "none";
    const height = collapsedHeight() + content.offsetHeight;
    content.style.position = previousPosition;
    content.style.visibility = previousVisibility;
    content.style.pointerEvents = previousPointerEvents;
    return height;
  }, [collapsedHeight]);

  const createTimeline = useCallback(() => {
    const nav = navRef.current;
    if (!nav) {
      return null;
    }

    gsap.set(nav, { height: collapsedHeight(), overflow: "hidden" });
    gsap.set(cardsRef.current, { opacity: 0, y: 30 });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timeline = gsap.timeline({ paused: true });
    timeline.to(nav, {
      duration: reduceMotion ? 0 : 0.42,
      ease,
      height: calculateHeight,
    });
    timeline.to(
      cardsRef.current,
      {
        duration: reduceMotion ? 0 : 0.38,
        ease,
        opacity: 1,
        stagger: reduceMotion ? 0 : 0.07,
        y: 0,
      },
      "-=0.16",
    );
    return timeline;
  }, [calculateHeight, collapsedHeight, ease]);

  useLayoutEffect(() => {
    const timeline = createTimeline();
    timelineRef.current = timeline;

    return () => {
      timeline?.kill();
      timelineRef.current = null;
    };
  }, [createTimeline, items]);

  const closeMenu = useCallback((restoreFocus = true) => {
    const timeline = timelineRef.current;
    if (!timeline || !isExpanded) {
      if (restoreFocus) menuButtonRef.current?.focus();
      return;
    }
    timeline.eventCallback("onReverseComplete", () => {
      setIsExpanded(false);
      if (restoreFocus) {
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    });
    timeline.reverse();
  }, [isExpanded]);

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      if (isExpanded) closeMenu(true);
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
    const handleResize = () => {
      const timeline = timelineRef.current;
      if (!timeline) {
        return;
      }
      timeline.kill();
      const replacement = createTimeline();
      if (replacement && isExpanded) {
        replacement.progress(1);
        gsap.set(navRef.current, { height: calculateHeight() });
      }
      timelineRef.current = replacement;
    };
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

    window.addEventListener("resize", handleResize);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [calculateHeight, closeMenu, createTimeline, isExpanded]);

  const toggleMenu = () => {
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }
    if (isExpanded) {
      closeMenu(true);
      return;
    }
    timeline.eventCallback("onReverseComplete", null);
    setIsExpanded(true);
    timeline.play(0);
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
          ref={contentRef}
        >
          {items.map((item, index) => (
            <section
              className="card-nav-card"
              key={item.label}
              ref={(element) => {
                if (element) cardsRef.current[index] = element;
              }}
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
