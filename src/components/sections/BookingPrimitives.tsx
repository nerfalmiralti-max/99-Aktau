import { AlertCircle, CheckCircle2, Clock3, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { formatDurationHours } from "../../services/booking/bookingRules";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_TARIFF_LABELS,
  type AdminBooking,
  type BookingRequest,
  type BookingStatus,
} from "../../services/booking/types";
import { formatBookingDate } from "../../utils/dateUtils";
import { formatBookingEnd, formatPrice } from "../../utils/bookingFormatters";

export type ConfirmTarget =
  | { kind: "booking"; booking: AdminBooking }
  | { kind: "all" }
  | null;

export function BookingStatusLabel({ status }: { status: BookingStatus }) {
  const Icon = status === "accepted" ? CheckCircle2 : status === "rejected" ? X : Clock3;
  return (
    <span className={`booking-status is-${status}`}>
      <Icon aria-hidden size={15} />
      <span>{BOOKING_STATUS_LABELS[status]}</span>
    </span>
  );
}

export function BookingDetails({ booking }: { booking: BookingRequest }) {
  return (
    <dl className="booking-detail-grid">
      <div><dt>Гость</dt><dd>{booking.name}</dd></div>
      <div><dt>Телефон</dt><dd>{booking.phone}</dd></div>
      <div><dt>Зал</dt><dd>{booking.room}</dd></div>
      <div><dt>Дата</dt><dd>{formatBookingDate(booking.date)}</dd></div>
      <div><dt>Начало</dt><dd>{booking.time}</dd></div>
      <div><dt>Продолжительность</dt><dd>{formatDurationHours(booking.durationHours)}</dd></div>
      <div><dt>Завершение</dt><dd>{formatBookingEnd(booking.date, booking.endDate, booking.endTime)}</dd></div>
      <div><dt>Тариф</dt><dd>{BOOKING_TARIFF_LABELS[booking.tariff]}</dd></div>
      <div><dt>Цена за час</dt><dd>{formatPrice(booking.hourlyPrice)}</dd></div>
      <div className="booking-detail-total"><dt>Ориентировочный итог</dt><dd>{formatPrice(booking.estimatedTotal)}</dd></div>
    </dl>
  );
}

export function ConfirmDialog({ busy, onCancel, onConfirm, target }: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  target: ConfirmTarget;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(busy);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!target) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const appShell = document.querySelector<HTMLElement>(".app-shell");
    appShell?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => cancelRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) onCancelRef.current();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)"));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      appShell?.removeAttribute("inert");
      if (previous?.isConnected && previous.getClientRects().length > 0) {
        previous.focus();
      } else {
        const heading = document.querySelector<HTMLElement>(".booking-panel-heading h2");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus();
          heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
        }
      }
    };
  }, [target]);

  if (!target) return null;
  const all = target.kind === "all";
  return createPortal(
    <div className="confirm-backdrop" role="presentation">
      <div aria-describedby="confirm-description" aria-labelledby="confirm-title" aria-modal="true" className="confirm-dialog" ref={dialogRef} role="alertdialog">
        <span className="confirm-dialog__icon"><AlertCircle aria-hidden size={22} /></span>
        <h2 id="confirm-title">{all ? "Удалить все заявки?" : `Удалить заявку ${target.booking.name}?`}</h2>
        <p id="confirm-description">{all ? "Будет удалена вся история заявок. Это действие нельзя отменить." : "Заявка исчезнет из панели и больше не будет доступна гостю."}</p>
        <div className="confirm-dialog__actions">
          <button aria-disabled={busy} className="button button-secondary" onClick={onCancel} ref={cancelRef} type="button">Отмена</button>
          <button className="button button-danger" disabled={busy} onClick={onConfirm} type="button">
            {busy ? <Loader2 aria-hidden className="spin" size={17} /> : <Trash2 aria-hidden size={17} />}
            <span>{busy ? "Удаляем…" : "Удалить"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
