import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { zoneCards } from "../../data/content";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";

export function Zones() {
  return (
    <section className="section zones-section" id="zones">
      <div className="container">
        <SectionHeader
          eyebrow="Цены"
          title="Тарифы залов."
          text="Действует ежедневно до 00:00 по времени Актау."
        />

        <div className="zones-layout">
          <Reveal className="zones-visual">
            <div className="media-placeholder zones-placeholder" aria-hidden>
              <span>Фото будет добавлено</span>
            </div>
          </Reveal>

          <div className="zone-cards">
            {zoneCards.map((zone, index) => {
              const Icon = zone.icon;

              return (
                <Reveal delay={index * 0.08} key={zone.title}>
                  <motion.article
                    className="zone-card"
                    whileHover={{ x: 8, scale: 1.01 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    <span className="zone-icon">
                      <Icon aria-hidden size={22} />
                    </span>
                    <div>
                      <h3>{zone.title}</h3>
                      <p>{zone.text}</p>
                      <ButtonLink
                        className="zone-link"
                        href="#booking"
                        variant="ghost"
                        icon={<ArrowRight aria-hidden size={16} />}
                      >
                        Выбрать
                      </ButtonLink>
                    </div>
                  </motion.article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
