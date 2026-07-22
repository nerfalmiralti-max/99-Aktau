import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminLoginModal } from "./components/admin/AdminLoginModal";
import { Footer } from "./components/layout/Footer";
import { Navbar } from "./components/layout/Navbar";
import { PageMetadata } from "./components/layout/PageMetadata";
import { Hero } from "./components/sections/Hero";
import { adminApi } from "./services/adminApi";

const About = lazy(() => import("./components/sections/About").then(({ About }) => ({ default: About })));
const Booking = lazy(() => import("./components/sections/Booking").then(({ Booking }) => ({ default: Booking })));
const Contacts = lazy(() => import("./components/sections/Contacts").then(({ Contacts }) => ({ default: Contacts })));
const Zones = lazy(() => import("./components/sections/Zones").then(({ Zones }) => ({ default: Zones })));

type AdminState = "loading" | "guest" | "admin";

function RouteEffects() {
  const { pathname } = useLocation();
  const isKeyboardNavigationRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = () => {
      isKeyboardNavigationRef.current = true;
    };

    const handlePointerDown = () => {
      isKeyboardNavigationRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    if (!isKeyboardNavigationRef.current) {
      return;
    }

    let observer: MutationObserver | undefined;
    let timeoutId: number | undefined;
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>("main h1");
      if (!heading) {
        return false;
      }

      const hadTabIndex = heading.hasAttribute("tabindex");
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });

      if (!hadTabIndex) {
        heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
      }
      return true;
    };

    const frame = window.requestAnimationFrame(() => {
      if (focusHeading()) {
        return;
      }

      const main = document.querySelector("main");
      if (!main) return;
      observer = new MutationObserver(() => {
        if (!focusHeading()) return;
        observer?.disconnect();
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      });
      observer.observe(main, { childList: true, subtree: true });
      timeoutId = window.setTimeout(() => observer?.disconnect(), 3000);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}

function RouteFallback() {
  return (
    <div aria-live="polite" className="route-loading" role="status">
      <span aria-hidden className="route-loading__indicator" />
      <span>Загружаем страницу…</span>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [adminLoginTrigger, setAdminLoginTrigger] = useState<HTMLElement | null>(null);
  const [adminState, setAdminState] = useState<AdminState>("loading");
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    const checkSession = () => {
      adminApi
        .session()
        .then(() => {
          if (isActive) setAdminState("admin");
        })
        .catch(() => {
          if (isActive) setAdminState("guest");
        });
    };
    const idleId = "requestIdleCallback" in window
      ? window.requestIdleCallback(checkSession, { timeout: 1200 })
      : undefined;
    const timerId = idleId === undefined ? window.setTimeout(checkSession, 350) : undefined;

    return () => {
      isActive = false;
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, []);

  const handleAdminLogout = async () => {
    try {
      await adminApi.logout();
      setAdminState("guest");
    } catch {
      return;
    }
  };

  return (
    <>
      <PageMetadata />
      <RouteEffects />
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      <div className="app-shell">
        <Navbar
          adminState={adminState}
          onAdminLogin={() => {
            setAdminLoginTrigger(document.activeElement as HTMLElement | null);
            setIsAdminLoginOpen(true);
          }}
          onAdminLogout={handleAdminLogout}
        />
        <main className={location.pathname === "/" ? undefined : "inner-page"} id="main-content">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Hero />} />
              <Route path="/about" element={<About />} />
              <Route path="/zones" element={<Zones />} />
              <Route
                path="/booking"
                element={(
                  <Booking
                    isAdmin={adminState === "admin"}
                    onAdminSessionExpired={() => setAdminState("guest")}
                  />
                )}
              />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => {
          setAdminState("admin");
          setIsAdminLoginOpen(false);
        }}
        restoreFocusTo={adminLoginTrigger}
      />
    </>
  );
}
