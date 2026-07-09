import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, CalendarCheck, MapPin } from "lucide-react";
import { AnimatedController } from "../brand/AnimatedController";
import { siteConfig } from "../../config/site.config";
import { ButtonLink } from "../ui/Button";

export function Hero() {
  return (
    <section className="hero-section" id="home" aria-label="Главный экран">
      <img
        className="hero-image"
        src={siteConfig.media.hero}
        alt="Премиальная игровая lounge-зона 99 AKTAU"
        width={1983}
        height={793}
        decoding="async"
        fetchPriority="high"
      />
      <div className="hero-overlay" />
      <div className="container hero-content">
        <div className="hero-copy">
          <motion.span
            className="eyebrow hero-eyebrow"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
          >
            <MapPin aria-hidden size={15} />
            {siteConfig.brand.city}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {siteConfig.brand.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            Премиальный gaming lounge для спокойной консольной игры, приватного отдыха
            и вечерних встреч в Актау.
          </motion.p>
          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.58 }}
          >
            <ButtonLink href="#booking" icon={<CalendarCheck aria-hidden size={18} />}>
              Забронировать
            </ButtonLink>
            <ButtonLink href="#zones" variant="secondary" icon={<ArrowRight aria-hidden size={18} />}>
              Игровые зоны
            </ButtonLink>
          </motion.div>
        </div>

        <AnimatedController />
      </div>

      <motion.a
        className="hero-scroll"
        href="#about"
        aria-label="Перейти к разделу о клубе"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.1 }, y: { duration: 2.2, repeat: Infinity } }}
      >
        <ArrowDown aria-hidden size={18} />
      </motion.a>
    </section>
  );
}
