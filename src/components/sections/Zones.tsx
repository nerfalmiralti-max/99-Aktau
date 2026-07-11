import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { zoneCards } from "../../data/content";
import { InnerPage } from "../layout/InnerPage";
import { PremiumBorderGlow } from "../react-bits/BorderGlow";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../ui/Reveal";

export function Zones() {
  return (
    <InnerPage
      className="zones-section"
      eyebrow="Цены"
      id="zones"
      title="Тарифы залов."
      text="Два формата бронирования с понятной стоимостью для каждого зала."
    >
      <div className="zones-layout" id="tariffs">
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
                <PremiumBorderGlow className="zone-card-glow">
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
                        to={`/booking?room=${zone.title === "VIP-зал" ? "vip" : "main"}`}
                        variant="ghost"
                        icon={<ArrowRight aria-hidden size={16} />}
                      >
                        Выбрать
                      </ButtonLink>
                    </div>
                  </motion.article>
                </PremiumBorderGlow>
              </Reveal>
            );
          })}
        </div>
      </div>

      <Reveal delay={0.1}>
        <PremiumBorderGlow className="promotion-glow">
          <div className="promotion-block" id="promotion">
            <div className="promotion-copy">
              <span className="eyebrow">Акция 2+1</span>
              <h3>Три часа по фиксированной цене.</h3>
              <p>Предложение действует ежедневно до 00:00 по времени Актау.</p>
            </div>
            <div className="promotion-offers">
              <div className="promotion-offer">
                <span>Основной зал</span>
                <strong>2+1 часа — 2000 ₸</strong>
              </div>
              <div className="promotion-offer">
                <span>VIP-зал</span>
                <strong>2+1 часа — 3500 ₸</strong>
              </div>
            </div>
          </div>
        </PremiumBorderGlow>
      </Reveal>
    </InnerPage>
  );
}
