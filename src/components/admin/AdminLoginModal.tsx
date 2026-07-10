import { AnimatePresence, motion } from "framer-motion";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { FormEvent, useEffect, useId, useState } from "react";
import { adminApi } from "../../services/adminApi";

type AdminLoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const titleId = useId();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPassword("");
        setMessage("");
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const closeModal = () => {
    setPassword("");
    setMessage("");
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      await adminApi.login(password);
      setPassword("");
      onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выполнить вход.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="admin-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            aria-label="Закрыть окно входа"
            className="admin-modal-backdrop"
            onClick={closeModal}
            type="button"
          />
          <motion.div
            aria-labelledby={titleId}
            aria-modal="true"
            className="admin-modal-panel"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            role="dialog"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              aria-label="Закрыть"
              className="admin-modal-close"
              onClick={closeModal}
              type="button"
            >
              <X aria-hidden size={19} />
            </button>
            <span className="feature-icon admin-modal-icon">
              <ShieldCheck aria-hidden size={22} />
            </span>
            <span className="eyebrow">Защищённый вход</span>
            <h2 id={titleId}>Вход для администратора</h2>
            <p>После входа включится встроенный режим администратора.</p>
            <form onSubmit={handleSubmit}>
              <label>
                <span>Пароль</span>
                <input
                  autoComplete="current-password"
                  autoFocus
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
              <motion.button
                className="button button-primary"
                disabled={isSubmitting}
                type="submit"
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{isSubmitting ? "Проверяем" : "Войти"}</span>
                {isSubmitting ? <Loader2 className="spin" aria-hidden size={18} /> : null}
              </motion.button>
              {message ? <div className="form-message form-message-error">{message}</div> : null}
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
