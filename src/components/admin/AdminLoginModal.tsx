import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { adminApi } from "../../services/adminApi";

type AdminLoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restoreFocusTo?: HTMLElement | null;
};

export function AdminLoginModal({ isOpen, onClose, onSuccess, restoreFocusTo }: AdminLoginModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const previousFocus = restoreFocusTo ?? (document.activeElement as HTMLElement | null);
    const appShell = document.querySelector<HTMLElement>(".app-shell");
    appShell?.setAttribute("inert", "");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPassword("");
        setMessage("");
        onClose();
        return;
      }
      if (event.key === "Tab" && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])",
        ));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (first && last && event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (first && last && !event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      appShell?.removeAttribute("inert");
      window.removeEventListener("keydown", handleKeyDown);
      const canRestorePreviousFocus = previousFocus?.isConnected
        && previousFocus.getClientRects().length > 0
        && !previousFocus.closest("[hidden]");
      if (canRestorePreviousFocus) {
        previousFocus.focus();
      } else {
        document.querySelector<HTMLElement>(".mobile-menu-toggle")?.focus();
      }
    };
  }, [isOpen, onClose, restoreFocusTo]);

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
      window.requestAnimationFrame(() => {
        passwordInputRef.current?.focus();
        passwordInputRef.current?.select();
      });
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
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        >
          <button
            aria-label="Закрыть окно входа"
            className="admin-modal-backdrop"
            onClick={closeModal}
            type="button"
          />
          <motion.div
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="admin-modal-panel"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            ref={panelRef}
            role="dialog"
            transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
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
            <p id={descriptionId}>После входа откроется защищённая панель управления заявками.</p>
            <form onSubmit={handleSubmit}>
              <label>
                <span>Пароль</span>
                <input
                  aria-describedby={message ? errorId : undefined}
                  aria-invalid={Boolean(message)}
                  autoComplete="current-password"
                  autoFocus
                  disabled={isSubmitting}
                  onChange={(event) => setPassword(event.target.value)}
                  ref={passwordInputRef}
                  required
                  type="password"
                  value={password}
                />
              </label>
              <motion.button
                className="button button-primary"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                type="submit"
                whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
              >
                <span>{isSubmitting ? "Входим…" : "Войти"}</span>
                {isSubmitting ? <Loader2 className="spin" aria-hidden size={18} /> : null}
              </motion.button>
              {message ? <div className="form-message form-message-error" id={errorId} role="alert">{message}</div> : null}
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
