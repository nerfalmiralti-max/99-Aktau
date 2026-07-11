import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AdminLoginModal } from "./components/admin/AdminLoginModal";
import { Footer } from "./components/layout/Footer";
import { LoadingScreen } from "./components/layout/LoadingScreen";
import { Navbar } from "./components/layout/Navbar";
import { About } from "./components/sections/About";
import { Booking } from "./components/sections/Booking";
import { Contacts } from "./components/sections/Contacts";
import { Hero } from "./components/sections/Hero";
import { Zones } from "./components/sections/Zones";
import { adminApi } from "./services/adminApi";

type AdminState = "loading" | "guest" | "admin";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [adminState, setAdminState] = useState<AdminState>("loading");
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 900);

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
      <AnimatePresence>{isLoading ? <LoadingScreen /> : null}</AnimatePresence>
      <motion.div
        className="app-shell"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <Navbar
          adminState={adminState}
          onAdminLogin={() => setIsAdminLoginOpen(true)}
          onAdminLogout={handleAdminLogout}
        />
        <main>
          <Hero />
          <About />
          <Zones />
          <Booking
            isAdmin={adminState === "admin"}
            onAdminSessionExpired={() => setAdminState("guest")}
          />
          <Contacts />
        </main>
        <Footer />
      </motion.div>
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
