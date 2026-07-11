import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig } from "../../config/site.config";
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
    label: siteConfig.navigation[0].label,
    links: siteConfig.navigation.slice(0, 2),
    bgColor: "#17121f",
    textColor: "#f7f4ff",
  },
  {
    label: siteConfig.navigation[2].label,
    links: siteConfig.navigation.slice(2, 4),
    bgColor: "#14121b",
    textColor: "#f7f4ff",
  },
  {
    label: siteConfig.navigation[4].label,
    links: siteConfig.navigation.slice(4, 5),
    bgColor: "#19131f",
    textColor: "#f7f4ff",
  },
];

export function Navbar({ adminState, onAdminLogin, onAdminLogout }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
