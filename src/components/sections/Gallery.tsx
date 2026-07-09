import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { galleryImages } from "../../data/content";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { SectionHeader } from "../ui/SectionHeader";

export function Gallery() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : galleryImages[activeIndex];
  useBodyScrollLock(activeIndex !== null);

  useEffect(() => {
    if (activeIndex === null) {
      return undefined;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index === null ? index : (index + 1) % galleryImages.length));
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((index) =>
          index === null ? index : (index - 1 + galleryImages.length) % galleryImages.length,
        );
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeIndex]);

  const showNext = () => {
    setActiveIndex((index) => (index === null ? 0 : (index + 1) % galleryImages.length));
  };

  const showPrevious = () => {
    setActiveIndex((index) =>
      index === null ? 0 : (index - 1 + galleryImages.length) % galleryImages.length,
    );
  };

  return (
    <section className="section gallery-section" id="gallery">
      <div className="container">
        <SectionHeader
          eyebrow="Галерея"
          title="Крупные кадры пространства без визуального шума."
          text="Галерея использует только подготовленные изображения проекта и открывает каждый кадр в аккуратном полноэкранном просмотре."
        />

        <div className="gallery-grid">
          {galleryImages.map((image, index) => (
            <motion.button
              className={`gallery-item gallery-item-${index + 1}`}
              type="button"
              key={image.src}
              onClick={() => setActiveIndex(index)}
              whileHover={{ y: -8, scale: 1.015 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              aria-label={`Открыть изображение: ${image.title}`}
            >
              <img
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
              />
              <span>{image.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeImage ? (
          <motion.div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={activeImage.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="lightbox-backdrop"
              type="button"
              aria-label="Закрыть галерею"
              onClick={() => setActiveIndex(null)}
            />
            <motion.div
              className="lightbox-panel"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                width={activeImage.width}
                height={activeImage.height}
                decoding="async"
              />
              <div className="lightbox-caption">
                <span>{activeImage.title}</span>
                <button type="button" onClick={() => setActiveIndex(null)} aria-label="Закрыть">
                  <X aria-hidden size={20} />
                </button>
              </div>
              <button
                className="lightbox-arrow lightbox-arrow-left"
                type="button"
                onClick={showPrevious}
                aria-label="Предыдущее изображение"
              >
                <ChevronLeft aria-hidden size={22} />
              </button>
              <button
                className="lightbox-arrow lightbox-arrow-right"
                type="button"
                onClick={showNext}
                aria-label="Следующее изображение"
              >
                <ChevronRight aria-hidden size={22} />
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
