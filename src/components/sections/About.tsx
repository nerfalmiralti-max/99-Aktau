import { motion, useReducedMotion } from "framer-motion";
import { aboutCards } from "../../data/content";
import { InnerPage } from "../layout/InnerPage";
import { Reveal } from "../ui/Reveal";

export function About() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <InnerPage
      className="about-section"
      eyebrow="О клубе"
      id="about"
      title="PlayStation-клуб в Актау с понятным онлайн-бронированием."
      text="99 AKTAU находится в 28-м микрорайоне, в ЖК «Империя». Выберите основной или VIP-зал, укажите удобное время и следите за статусом заявки на сайте."
    >
      <div className="about-grid">
        {aboutCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <Reveal delay={index * 0.08} key={card.title}>
              <motion.article
                className="feature-card"
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="feature-icon">
                  <Icon aria-hidden size={22} />
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </motion.article>
            </Reveal>
          );
        })}
      </div>
    </InnerPage>
  );
}
