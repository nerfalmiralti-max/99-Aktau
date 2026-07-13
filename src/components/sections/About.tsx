import { motion } from "framer-motion";
import { aboutCards } from "../../data/content";
import { InnerPage } from "../layout/InnerPage";
import { Reveal } from "../ui/Reveal";

export function About() {
  return (
    <InnerPage
      className="about-section"
      eyebrow="О клубе"
      id="about"
      title="Пространство для спокойной игры и приватного отдыха."
      text="99 AKTAU соединяет комфортную посадку, приглушенный свет и понятный путь к бронированию без лишнего шума."
    >
      <div className="about-grid">
        {aboutCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <Reveal delay={index * 0.08} key={card.title}>
              <motion.article
                className="feature-card"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
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
