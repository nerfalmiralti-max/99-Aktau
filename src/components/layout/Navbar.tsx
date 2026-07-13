"use client";

import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "../../config/site.config";
import { createInstagramHref, createWhatsAppHref } from "../../utils/linkUtils";
import { CardNav, type CardNavItem } from "../react-bits/CardNav";

type AdminState = "loading" | "guest" | "admin";

type NavbarProps = {
  adminState: AdminState;
  onAdminLogin: () => void;
  onAdminLogout: () => void;
};

function AdminNavigationControl({ adminState, onAdminLogin, onAdminLogout }: NavbarProps) {
  if (adminState === "loading") {
    return (
      <button className="admin-nav-control admin-nav-entry" disabled type="button">
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
      <span><ShieldCheck aria-hidden size={15} />Режим администратора</span>
      <button onClick={onAdminLogout} type="button">
        <LogOut aria-hidden size={15} />
        <span>Выйти</span>
      </button>
    </div>
  );
}

const cardNavItems: CardNavItem[] = [
  {
    label: "Клуб",
    links: siteConfig.navigation.slice(0, 3),
    bgColor: "#17121f",
    textColor: "#f7f4ff",
  },
  {
    label: "Бронирование",
    links: [
      { label: "Забронировать", path: "/booking" },
      { label: "Тарифы", path: "/zones#tariffs" },
      { label: "Акция 2+1", path: "/zones#promotion" },
    ],
    bgColor: "#14121b",
    textColor: "#f7f4ff",
  },
  {
    label: "Контакты",
    links: [
      siteConfig.navigation[4],
      {
        ariaLabel: `Открыть WhatsApp ${siteConfig.brand.name}`,
        href: createWhatsAppHref(siteConfig.contacts.whatsapp),
        label: "WhatsApp",
      },
      {
        ariaLabel: `Открыть Instagram ${siteConfig.brand.name}`,
        href: siteConfig.contacts.instagramUrl ?? createInstagramHref(siteConfig.contacts.instagram),
        label: "Instagram",
      },
    ],
    bgColor: "#19131f",
    textColor: "#f7f4ff",
  },
];

export function Navbar({ adminState, onAdminLogin, onAdminLogout }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const frameRef = useRef<number | null>(null);

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

  return (
    <CardNav
      adminControl={(
        <AdminNavigationControl
          adminState={adminState}
          onAdminLogin={onAdminLogin}
          onAdminLogout={onAdminLogout}
        />
      )}
      isScrolled={isScrolled}
      items={cardNavItems}
    />
  );
}
