import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, CalendarCheck, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedController } from "../brand/AnimatedController";
import { siteConfig } from "../../config/site.config";
import { ButtonLink } from "../ui/Button";
import { GradualBlur } from "../react-bits/GradualBlur";
import { AuroraHeroBackground } from "./AuroraHeroBackground";

const MotionLink = motion.create(Link);

export function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const shouldAnimateScrollCue = !shouldReduceMotion && !isMobile;

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const updateMobileState = () => setIsMobile(mobileQuery.matches);

    updateMobileState();
    mobileQuery.addEventListener("change", updateMobileState);
    return () => mobileQuery.removeEventListener("change", updateMobileState);
  }, []);

  return (
    <section className="hero-section" id="home" aria-label="Главный экран">
      <AuroraHeroBackground />
      <div className="hero-overlay" />
      <div className="container hero-content">
        <div className="hero-copy">
          <motion.span
            className="eyebrow hero-eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.44, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <MapPin aria-hidden size={15} />
            {siteConfig.brand.city}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {siteConfig.brand.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Пространство для спокойной игры, приватного отдыха и встреч, где все
            продумано для комфортного вечера.
          </motion.p>
          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ButtonLink to="/booking" icon={<CalendarCheck aria-hidden size={18} />}>
              Забронировать
            </ButtonLink>
            <ButtonLink to="/zones" variant="secondary" icon={<ArrowRight aria-hidden size={18} />}>
              Игровые зоны
            </ButtonLink>
          </motion.div>
        </div>

        <AnimatedController />
      </div>

      <MotionLink
        className="hero-scroll"
        to="/about"
        aria-label="Перейти к разделу о клубе"
        initial={{ opacity: 0 }}
        animate={shouldAnimateScrollCue ? { opacity: 1, y: [0, 8, 0] } : { opacity: 1, y: 0 }}
        transition={
          shouldAnimateScrollCue
            ? { opacity: { delay: 0.62 }, y: { duration: 2.2, repeat: Infinity } }
            : { duration: 0.2 }
        }
      >
        <ArrowDown aria-hidden size={18} />
      </MotionLink>

      <GradualBlur
        target="parent"
        position="bottom"
        height="4rem"
        strength={1}
        divCount={4}
        curve="bezier"
        exponential={false}
        opacity={0.8}
        animated={false}
        className="hero-gradual-blur"
      />
    </section>
  );
}
