import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminLoginModal } from "./components/admin/AdminLoginModal";
import { Footer } from "./components/layout/Footer";
import { LoadingScreen } from "./components/layout/LoadingScreen";
import { Navbar } from "./components/layout/Navbar";
import { PageMetadata } from "./components/layout/PageMetadata";
import { Hero } from "./components/sections/Hero";
import { adminApi } from "./services/adminApi";

const About = lazy(() => import("./components/sections/About").then(({ About }) => ({ default: About })));
const Booking = lazy(() => import("./components/sections/Booking").then(({ Booking }) => ({ default: Booking })));
const Contacts = lazy(() => import("./components/sections/Contacts").then(({ Contacts }) => ({ default: Contacts })));
const Zones = lazy(() => import("./components/sections/Zones").then(({ Zones }) => ({ default: Zones })));

type AdminState = "loading" | "guest" | "admin";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default function App() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [adminState, setAdminState] = useState<AdminState>("loading");
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 520);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isActive = true;
    adminApi
      .session()
      .then(() => {
        if (isActive) {
          setAdminState("admin");
        }
      })
      .catch(() => {
        if (isActive) {
          setAdminState("guest");
        }
      });

    return () => {
      isActive = false;
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
      <ScrollToTop />
      <AnimatePresence>{isLoading ? <LoadingScreen /> : null}</AnimatePresence>
      <div className="app-shell">
        <Navbar
          adminState={adminState}
          onAdminLogin={() => setIsAdminLoginOpen(true)}
          onAdminLogout={handleAdminLogout}
        />
        <main className={location.pathname === "/" ? undefined : "inner-page"}>
          <Suspense fallback={null}>
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
      />
    </>
  );
}
