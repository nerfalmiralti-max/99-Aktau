import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Footer } from "./components/layout/Footer";
import { LoadingScreen } from "./components/layout/LoadingScreen";
import { Navbar } from "./components/layout/Navbar";
import { About } from "./components/sections/About";
import { Booking } from "./components/sections/Booking";
import { Contacts } from "./components/sections/Contacts";
import { Hero } from "./components/sections/Hero";
import { Zones } from "./components/sections/Zones";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 900);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>{isLoading ? <LoadingScreen /> : null}</AnimatePresence>
      <motion.div
        className="app-shell"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <Navbar />
        <main>
          <Hero />
          <About />
          <Zones />
          <Booking />
          <Contacts />
        </main>
        <Footer />
      </motion.div>
    </>
  );
}
