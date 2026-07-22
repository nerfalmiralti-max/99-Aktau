import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarCheck, Clock3, Gamepad2 } from "lucide-react";
import { zoneCards } from "../../data/content";
import { InnerPage } from "../layout/InnerPage";
import { PremiumBorderGlow } from "../react-bits/BorderGlow";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../ui/Reveal";

export function Zones() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <InnerPage
      className="zones-section"
      eyebrow="Залы и цены"
      id="zones"
      title="Выберите зал под свой план."
      text="Почасовая бронь или акция 2+1 — сравните подтверждённые цены и отправьте заявку на удобное время."
    >
      <div className="zones-layout" id="tariffs">
        <Reveal className="zones-visual">
          <div className="zones-intro-card">
            <span className="zones-kicker">
              <Gamepad2 aria-hidden size={18} />
              2 игровых зала
            </span>
            <h2>Прозрачная цена до отправки заявки.</h2>
            <p>
              Выберите зал, дату, начало и продолжительность. Итоговая стоимость
              рассчитывается до подтверждения бронирования.
            </p>
            <ul className="zones-facts" aria-label="Условия бронирования">
              <li>
                <CalendarCheck aria-hidden size={17} />
                Заявка оформляется онлайн
              </li>
              <li>
                <Clock3 aria-hidden size={17} />
                Акция 2+1 действует ежедневно до 00:00
              </li>
            </ul>
            <ButtonLink
              to="/booking"
              variant="secondary"
              icon={<ArrowRight aria-hidden size={17} />}
            >
              Перейти к бронированию
            </ButtonLink>
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
                    whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="zone-icon">
                      <Icon aria-hidden size={22} />
                    </span>
                    <div>
                      <h3>{zone.title}</h3>
                      <div className="zone-price">
                        <strong>{zone.price}</strong>
                        <span>{zone.priceUnit}</span>
                      </div>
                      <p className="zone-note">{zone.promotion}</p>
                      <ButtonLink
                        className="zone-link"
                        to={`/booking?room=${zone.bookingRoom}`}
                        variant="ghost"
                        icon={<ArrowRight aria-hidden size={16} />}
                      >
                        Выбрать зал
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
              <p>
                Предложение действует ежедневно и доступно для бронирований,
                которые завершаются до 00:00 по времени Актау.
              </p>
            </div>
            <div className="promotion-offers">
              <div className="promotion-offer">
                <span>Основной зал</span>
                <strong>2+1 часа — 2 000 ₸</strong>
              </div>
              <div className="promotion-offer">
                <span>VIP-зал</span>
                <strong>2+1 часа — 3 500 ₸</strong>
              </div>
            </div>
          </div>
        </PremiumBorderGlow>
      </Reveal>
    </InnerPage>
  );
}
