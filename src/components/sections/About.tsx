import { motion } from "framer-motion";
import { aboutCards } from "../../data/content";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";

export function About() {
  return (
    <section className="section about-section" id="about">
      <div className="container">
        <SectionHeader
          eyebrow="О клубе"
          title="Спокойный lounge-формат для консольного отдыха."
          text="99 AKTAU подается как современное пространство с чистой композицией, темным премиальным светом и понятным путем к бронированию."
        />

        <div className="about-grid">
          {aboutCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <Reveal delay={index * 0.08} key={card.title}>
                <motion.article
                  className="feature-card"
                  whileHover={{ y: -8, rotateX: 2, rotateY: -2 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
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
      </div>
    </section>
  );
}
