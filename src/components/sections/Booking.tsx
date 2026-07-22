import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CalendarCheck,
  Check,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminBookingApi, bookingApi, BookingApiError } from "../../services/booking/bookingApi";
import {
  calculateBookingQuote,
  formatDurationHours,
  HOURLY_PRICES,
  isValidDurationHours,
  MAX_DURATION_HOURS,
  MIN_DURATION_HOURS,
} from "../../services/booking/bookingRules";
import {
  BOOKING_ROOMS,
  BOOKING_TARIFF_LABELS,
  BOOKING_TARIFFS,
  type AdminBooking,
  type BookingInput,
  type BookingRequest,
  type BookingRoom,
  type BookingStatus,
  type BookingTariff,
} from "../../services/booking/types";
import { formatBookingDate, getAktauToday } from "../../utils/dateUtils";
import { formatBookingEnd, formatCreatedAt, formatPrice } from "../../utils/bookingFormatters";
import { InnerPage } from "../layout/InnerPage";
import { PremiumBorderGlow } from "../react-bits/BorderGlow";
import { Reveal } from "../ui/Reveal";
import {
  BookingDetails,
  BookingStatusLabel,
  ConfirmDialog,
  type ConfirmTarget,
} from "./BookingPrimitives";

type BookingProps = { isAdmin: boolean; onAdminSessionExpired: () => void };
type BookingErrors = Partial<Record<keyof BookingInput | "form", string>>;
type SubmitState = "idle" | "loading" | "success" | "error";
type GuestStatusState = "loading" | "ready" | "error";
type AdminFilter = "all" | BookingStatus | "today" | "main" | "vip";

const ADMIN_FILTERS: ReadonlyArray<{ id: AdminFilter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "pending", label: "Ожидают" },
  { id: "accepted", label: "Приняты" },
  { id: "rejected", label: "Отклонены" },
  { id: "today", label: "Сегодня" },
  { id: "main", label: "Основной зал" },
  { id: "vip", label: "VIP-зал" },
];

function initialForm(room: BookingRoom = BOOKING_ROOMS[0]): BookingInput {
  return {
    name: "",
    phone: "",
    date: "",
    time: "",
    durationHours: MIN_DURATION_HOURS,
    room,
    tariff: BOOKING_TARIFFS[0],
    comment: "",
    privacyConsent: false,
  };
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function RoomAndTariff({ form, onField, onTariff }: {
  form: BookingInput;
  onField: <Key extends keyof BookingInput>(key: Key, value: BookingInput[Key]) => void;
  onTariff: (tariff: BookingTariff) => void;
}) {
  return (
    <>
      <div className="booking-step-heading"><span>01</span><div><h2>Зал и тариф</h2><p>Сравните цену и выберите формат.</p></div></div>
      <fieldset className="booking-choice-group">
        <legend>Игровой зал</legend>
        <div className="booking-choice-grid">
          {BOOKING_ROOMS.map((room) => (
            <label className={`booking-choice-card${form.room === room ? " is-selected" : ""}`} key={room}>
              <input checked={form.room === room} name="room" onChange={() => onField("room", room)} type="radio" value={room} />
              <span><strong>{room}</strong><small>{formatPrice(HOURLY_PRICES[room])} / час</small></span>
              <CheckCircle2 aria-hidden size={19} />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="booking-choice-group">
        <legend>Тариф</legend>
        <div className="booking-choice-grid">
          {BOOKING_TARIFFS.map((tariff) => (
            <label className={`booking-choice-card${form.tariff === tariff ? " is-selected" : ""}`} key={tariff}>
              <input checked={form.tariff === tariff} name="tariff" onChange={() => onTariff(tariff)} type="radio" value={tariff} />
              <span>
                <strong>{BOOKING_TARIFF_LABELS[tariff]}</strong>
                <small>{tariff === "promotion" ? "3 часа, завершение до 00:00" : "От 1 до 12 часов"}</small>
              </span>
              <CheckCircle2 aria-hidden size={19} />
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function BookingFields({
  errors,
  form,
  onDuration,
  onField,
  onTariff,
  today,
}: {
  errors: BookingErrors;
  form: BookingInput;
  onDuration: (value: number) => void;
  onField: <Key extends keyof BookingInput>(key: Key, value: BookingInput[Key]) => void;
  onTariff: (tariff: BookingTariff) => void;
  today: string;
}) {
  return (
    <div className="booking-fields">
      <RoomAndTariff form={form} onField={onField} onTariff={onTariff} />
      <div className="booking-step-heading"><span>02</span><div><h2>Когда и на сколько</h2><p>Время указано по Актау.</p></div></div>
      <div className="form-row">
        <label htmlFor="booking-date">
          <span>Дата</span>
          <input
            aria-describedby={errors.date ? "booking-date-error" : undefined}
            aria-invalid={Boolean(errors.date)}
            className={errors.date ? "has-error" : ""}
            id="booking-date"
            min={today}
            name="date"
            onChange={(event) => onField("date", event.target.value)}
            required
            type="date"
            value={form.date}
          />
          {errors.date ? <small id="booking-date-error" role="alert">{errors.date}</small> : null}
        </label>
        <label htmlFor="booking-time">
          <span>Время начала</span>
          <input
            aria-describedby={errors.time ? "booking-time-error" : undefined}
            aria-invalid={Boolean(errors.time)}
            className={errors.time ? "has-error" : ""}
            id="booking-time"
            name="time"
            onChange={(event) => onField("time", event.target.value)}
            required
            type="time"
            value={form.time}
          />
          {errors.time ? <small id="booking-time-error" role="alert">{errors.time}</small> : null}
        </label>
      </div>
      <fieldset className="duration-fieldset">
        <legend>Продолжительность</legend>
        <div className="duration-control" aria-describedby="duration-help">
          <button
            aria-label="Уменьшить продолжительность на один час"
            disabled={form.tariff === "promotion" || form.durationHours === MIN_DURATION_HOURS}
            onClick={() => onDuration(form.durationHours - 1)}
            type="button"
          ><Minus aria-hidden size={20} /></button>
          <output aria-live="polite" htmlFor="duration-select">{formatDurationHours(form.durationHours)}</output>
          <button
            aria-label="Увеличить продолжительность на один час"
            disabled={form.tariff === "promotion" || form.durationHours === MAX_DURATION_HOURS}
            onClick={() => onDuration(form.durationHours + 1)}
            type="button"
          ><Plus aria-hidden size={20} /></button>
          <select
            aria-invalid={Boolean(errors.durationHours)}
            aria-label="Выбрать продолжительность"
            disabled={form.tariff === "promotion"}
            id="duration-select"
            name="durationHours"
            onChange={(event) => onDuration(Number(event.target.value))}
            value={form.durationHours}
          >
            {Array.from({ length: MAX_DURATION_HOURS }, (_, index) => index + 1).map((hours) => (
              <option key={hours} value={hours}>{formatDurationHours(hours)}</option>
            ))}
          </select>
        </div>
        <small id="duration-help">{form.tariff === "promotion" ? "Для акции продолжительность фиксирована: 3 часа." : "Минимум 1 час, максимум 12 часов."}</small>
        {errors.durationHours ? <small role="alert">{errors.durationHours}</small> : null}
      </fieldset>

      <div className="booking-step-heading"><span>03</span><div><h2>Контактные данные</h2><p>Нужны для подтверждения заявки.</p></div></div>
      <div className="form-row">
        <label htmlFor="booking-name">
          <span>Имя</span>
          <input
            aria-describedby={errors.name ? "booking-name-error" : undefined}
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
            className={errors.name ? "has-error" : ""}
            id="booking-name"
            name="name"
            onChange={(event) => onField("name", event.target.value)}
            placeholder="Ваше имя"
            required
            value={form.name}
          />
          {errors.name ? <small id="booking-name-error" role="alert">{errors.name}</small> : null}
        </label>
        <label htmlFor="booking-phone">
          <span>Телефон</span>
          <input
            aria-describedby={errors.phone ? "booking-phone-error" : undefined}
            aria-invalid={Boolean(errors.phone)}
            autoComplete="tel"
            className={errors.phone ? "has-error" : ""}
            id="booking-phone"
            inputMode="tel"
            name="phone"
            onChange={(event) => onField("phone", event.target.value)}
            placeholder="+7 701 000 00 00"
            required
            value={form.phone}
          />
          {errors.phone ? <small id="booking-phone-error" role="alert">{errors.phone}</small> : null}
        </label>
      </div>
      <label htmlFor="booking-comment">
        <span>Комментарий <small>(необязательно)</small></span>
        <textarea id="booking-comment" maxLength={500} name="comment" onChange={(event) => onField("comment", event.target.value)} placeholder="Пожелания по времени" rows={3} value={form.comment} />
      </label>
      <label className="form-consent">
        <input
          aria-describedby={errors.privacyConsent ? "booking-consent-error" : undefined}
          aria-invalid={Boolean(errors.privacyConsent)}
          checked={form.privacyConsent}
          name="privacyConsent"
          onChange={(event) => onField("privacyConsent", event.target.checked)}
          required
          type="checkbox"
        />
        <span>Согласен(на) на обработку контактных данных для этой заявки</span>
      </label>
      {errors.privacyConsent ? <small className="form-consent-error" id="booking-consent-error" role="alert">{errors.privacyConsent}</small> : null}
      <p className="booking-limit-note"><ShieldCheck aria-hidden size={16} />На один номер — одна активная будущая заявка. Учитываются статусы «Ожидает» и «Принята».</p>
    </div>
  );
}

function BookingSummary({ form, message, quote, state }: {
  form: BookingInput;
  message: string;
  quote: ReturnType<typeof calculateBookingQuote> | null;
  state: SubmitState;
}) {
  const reducedMotion = useReducedMotion();
  const base = quote?.baseTotal ?? HOURLY_PRICES[form.room] * form.durationHours;
  const total = quote?.estimatedTotal ?? base;
  const end = quote && form.date && form.time ? formatBookingEnd(form.date, quote.endDate, quote.endTime) : "Выберите дату и время";
  return (
    <aside className="booking-summary" aria-label="Итог бронирования">
      <span className="panel-kicker">Ваша заявка</span><h2>Проверьте детали</h2>
      <dl className="booking-summary-list">
        <div><dt>Зал</dt><dd>{form.room}</dd></div>
        <div><dt>Дата</dt><dd>{form.date ? formatBookingDate(form.date) : "Не выбрана"}</dd></div>
        <div><dt>Начало</dt><dd>{form.time || "Не выбрано"}</dd></div>
        <div><dt>Длительность</dt><dd>{formatDurationHours(form.durationHours)}</dd></div>
        <div><dt>Завершение</dt><dd>{end}</dd></div>
        <div><dt>Гость</dt><dd>{form.name.trim() || "Не указано"}</dd></div>
        <div><dt>Телефон</dt><dd>{form.phone.trim() || "Не указан"}</dd></div>
      </dl>
      <div className="booking-calculation">
        <div><span>{formatPrice(HOURLY_PRICES[form.room])} × {form.durationHours}</span><strong>{formatPrice(base)}</strong></div>
        {form.tariff === "promotion" && quote ? <div className="booking-discount"><span>Выгода по акции 2+1</span><strong>−{formatPrice(quote.promotionDiscount)}</strong></div> : null}
        <div className="booking-total"><span>Ориентировочный итог</span><strong>{formatPrice(total)}</strong></div>
      </div>
      {form.tariff === "promotion" && !quote ? <p className="summary-warning"><AlertCircle aria-hidden size={16} />Акция должна завершиться не позднее 00:00.</p> : null}
      <motion.button
        aria-busy={state === "loading"}
        className="button button-primary form-submit"
        disabled={state === "loading"}
        transition={{ duration: reducedMotion ? 0 : 0.18 }}
        type="submit"
        whileHover={reducedMotion ? undefined : { y: -1 }}
        whileTap={reducedMotion ? undefined : { scale: 0.985 }}
      >
        <span>{state === "loading" ? "Отправляем…" : "Отправить заявку"}</span>
        {state === "loading" ? <Loader2 className="spin" aria-hidden size={18} /> : <CalendarCheck aria-hidden size={18} />}
      </motion.button>
      <small className="summary-caption">Администратор проверит время и обновит статус заявки.</small>
      {message ? (
        <div className={`form-message form-message-${state}`} role={state === "error" ? "alert" : "status"}>
          {state === "success" ? <CheckCircle2 aria-hidden size={18} /> : <AlertCircle aria-hidden size={18} />}<span>{message}</span>
        </div>
      ) : null}
    </aside>
  );
}

export function Booking({ isAdmin, onAdminSessionExpired }: BookingProps) {
  const [searchParams] = useSearchParams();
  const room = searchParams.get("room") === "vip" ? BOOKING_ROOMS[1] : BOOKING_ROOMS[0];
  const [form, setForm] = useState<BookingInput>(() => initialForm(room));
  const [errors, setErrors] = useState<BookingErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<BookingRequest | null>(null);
  const [guestStatusState, setGuestStatusState] = useState<GuestStatusState>("loading");
  const [guestStatusMessage, setGuestStatusMessage] = useState("");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [filter, setFilter] = useState<AdminFilter>("all");
  const [adminLoading, setAdminLoading] = useState(false);
  const [actionKey, setActionKey] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminMessageType, setAdminMessageType] = useState<"success" | "error">("success");
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const today = useMemo(() => getAktauToday(), []);

  const quote = useMemo(() => {
    try {
      return calculateBookingQuote(form.room, form.tariff, form.durationHours, form.date || "2099-01-01", form.time || "12:00");
    } catch {
      return null;
    }
  }, [form]);

  const loadMine = useCallback(async () => {
    setGuestStatusState("loading");
    setGuestStatusMessage("");
    try {
      setConfirmation(await bookingApi.mine());
      setGuestStatusState("ready");
    } catch (error) {
      setConfirmation(null);
      setGuestStatusState("error");
      setGuestStatusMessage(error instanceof Error ? error.message : "Не удалось проверить последнюю заявку.");
    }
  }, []);

  const loadAdmin = useCallback(async () => {
    setAdminLoading(true); setAdminMessage("");
    try { setBookings(await adminBookingApi.list()); }
    catch (error) {
      if (error instanceof BookingApiError && error.status === 401) onAdminSessionExpired();
      else { setAdminMessageType("error"); setAdminMessage(error instanceof Error ? error.message : "Не удалось загрузить заявки"); }
    } finally { setAdminLoading(false); }
  }, [onAdminSessionExpired]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isAdmin) void loadAdmin();
      else { setBookings([]); void loadMine(); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin, loadAdmin, loadMine]);

  const updateField = <Key extends keyof BookingInput>(key: Key, value: BookingInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
    setMessage(""); setSubmitState("idle");
  };
  const selectTariff = (tariff: BookingTariff) => {
    setForm((current) => ({ ...current, tariff, durationHours: tariff === "promotion" ? 3 : current.durationHours }));
    setErrors((current) => ({ ...current, tariff: undefined, durationHours: undefined, time: undefined }));
    setMessage("");
  };
  const setDuration = (value: number) => {
    if (form.tariff !== "promotion" && isValidDurationHours(value)) updateField("durationHours", value);
  };

  const validate = (candidate: BookingInput) => {
    const next: BookingErrors = {};
    if (candidate.name.trim().length < 2) next.name = "Введите имя.";
    if (phoneDigits(candidate.phone).length < 10 || phoneDigits(candidate.phone).length > 15) next.phone = "Введите корректный телефон.";
    if (!candidate.date) next.date = "Выберите дату.";
    else if (candidate.date < today) next.date = "Дата не может быть в прошлом.";
    if (!candidate.time) next.time = "Выберите время.";
    if (!isValidDurationHours(candidate.durationHours)) next.durationHours = "Выберите целое количество часов от 1 до 12.";
    if (!candidate.privacyConsent) next.privacyConsent = "Подтвердите согласие.";
    if (candidate.date && candidate.time && isValidDurationHours(candidate.durationHours)) {
      try {
        const checked = calculateBookingQuote(candidate.room, candidate.tariff, candidate.durationHours, candidate.date, candidate.time);
        if (Date.parse(checked.startAt) <= Date.now()) next.time = "Выберите будущее время по часовому поясу Актау.";
      } catch {
        next.time = candidate.tariff === "promotion" ? "Для акции выберите 3 часа с завершением не позднее 00:00." : "Проверьте дату, время и продолжительность.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return false;
    }
    return true;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = { ...form, name: form.name.trim(), phone: form.phone.trim(), comment: form.comment.trim() };
    setForm(candidate);
    if (!validate(candidate)) { setSubmitState("idle"); setMessage(""); return; }
    setSubmitState("loading");
    try {
      const result = await bookingApi.create(candidate);
      setConfirmation(result.booking); setGuestStatusState("ready"); setGuestStatusMessage(""); setForm(initialForm(room)); setSubmitState("success"); setMessage(result.message);
      if (isAdmin) await loadAdmin();
    } catch (error) { setSubmitState("error"); setMessage(error instanceof Error ? error.message : "Не удалось сохранить заявку"); }
  };

  const updateStatus = async (booking: AdminBooking, status: Exclude<BookingStatus, "pending">) => {
    const key = `${booking.id}:${status}`; setActionKey(key); setAdminMessage("");
    try {
      const updated = await adminBookingApi.updateStatus(booking.id, status);
      setBookings((current) => current.map((item) => item.id === booking.id ? updated : item));
      setAdminMessageType("success"); setAdminMessage(`Статус заявки ${booking.name} обновлён.`);
    } catch (error) {
      if (error instanceof BookingApiError && error.status === 401) onAdminSessionExpired();
      else { setAdminMessageType("error"); setAdminMessage(error instanceof Error ? error.message : "Не удалось изменить статус"); }
    } finally { setActionKey(""); }
  };

  const confirmAction = async () => {
    if (!confirmTarget) return;
    setConfirmBusy(true); setAdminMessage("");
    try {
      if (confirmTarget.kind === "all") { await adminBookingApi.clear(); setBookings([]); setAdminMessage("Список заявок очищен."); }
      else {
        await adminBookingApi.delete(confirmTarget.booking.id);
        setBookings((current) => current.filter((item) => item.id !== confirmTarget.booking.id));
        setAdminMessage(`Заявка ${confirmTarget.booking.name} удалена.`);
      }
      setAdminMessageType("success"); setConfirmTarget(null);
    } catch (error) {
      if (error instanceof BookingApiError && error.status === 401) onAdminSessionExpired();
      else { setAdminMessageType("error"); setAdminMessage(error instanceof Error ? error.message : "Не удалось удалить заявку"); }
    } finally { setConfirmBusy(false); }
  };

  const visibleBookings = useMemo(() => [...bookings].filter((booking) => {
    if (filter === "all") return true;
    if (filter === "pending" || filter === "accepted" || filter === "rejected") return booking.status === filter;
    if (filter === "today") return booking.date === today;
    return booking.room === (filter === "main" ? BOOKING_ROOMS[0] : BOOKING_ROOMS[1]);
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [bookings, filter, today]);

  return (
    <InnerPage
      className="booking-section"
      eyebrow="Онлайн-бронирование"
      id="booking"
      title="Соберите заявку и сразу проверьте расчёт."
      text="Выберите зал, начало и продолжительность от 1 до 12 часов. Администратор проверит время и изменит статус заявки."
    >
      <Reveal>
        <PremiumBorderGlow className="booking-form-glow">
          <form className="booking-form booking-builder" noValidate onSubmit={submit} ref={formRef}>
            <BookingFields errors={errors} form={form} onDuration={setDuration} onField={updateField} onTariff={selectTariff} today={today} />
            <BookingSummary form={form} message={message} quote={quote} state={submitState} />
          </form>
        </PremiumBorderGlow>
      </Reveal>

      <Reveal className="booking-panel booking-management" delay={0.08}>
        <div className="booking-panel-heading">
          <div><span className="panel-kicker">{isAdmin ? "Рабочая панель" : "Статус заявки"}</span><h2>{isAdmin ? "Управление бронированиями" : "Последняя заявка"}</h2></div>
          {isAdmin ? <button className="button button-secondary refresh-bookings" disabled={adminLoading} onClick={() => void loadAdmin()} type="button"><RefreshCw aria-hidden className={adminLoading ? "spin" : undefined} size={17} /><span>Обновить</span></button> : null}
        </div>
        {isAdmin ? (
          <>
            <div aria-label="Фильтры заявок" className="booking-filters" role="group">
              {ADMIN_FILTERS.map((item) => <button aria-pressed={filter === item.id} className={filter === item.id ? "is-active" : ""} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>)}
            </div>
            <p className="booking-result-count">Показано: {visibleBookings.length} из {bookings.length}</p>
            {adminLoading ? (
              <div aria-label="Загружаем заявки" className="booking-skeleton-list" role="status">{Array.from({ length: 3 }, (_, i) => <span className="booking-skeleton" key={i} />)}</div>
            ) : visibleBookings.length ? (
              <div className="booking-list admin-booking-list">
                {visibleBookings.map((booking) => (
                  <article className="booking-list-item admin-booking-card" key={booking.id}>
                    <header><div><strong>{booking.name}</strong><a href={`tel:${booking.phone.replace(/[^+\d]/g, "")}`}>{booking.phone}</a></div><BookingStatusLabel status={booking.status} /></header>
                    <BookingDetails booking={booking} />
                    {booking.comment ? <p className="booking-comment"><span>Комментарий</span>{booking.comment}</p> : null}
                    <p className="booking-created">Создана: {formatCreatedAt(booking.createdAt)}</p>
                    <div className="booking-admin-actions">
                      <button aria-busy={actionKey === `${booking.id}:accepted`} aria-label={`Принять заявку ${booking.name}`} disabled={Boolean(actionKey) || booking.status === "accepted"} onClick={() => void updateStatus(booking, "accepted")} type="button">
                        {actionKey === `${booking.id}:accepted` ? <Loader2 aria-hidden className="spin" size={16} /> : <Check aria-hidden size={16} />}<span>Принять</span>
                      </button>
                      <button aria-busy={actionKey === `${booking.id}:rejected`} aria-label={`Отклонить заявку ${booking.name}`} disabled={Boolean(actionKey) || booking.status === "rejected"} onClick={() => void updateStatus(booking, "rejected")} type="button">{actionKey === `${booking.id}:rejected` ? <Loader2 aria-hidden className="spin" size={16} /> : <X aria-hidden size={16} />}<span>Отклонить</span></button>
                      <button aria-label={`Удалить заявку ${booking.name}`} disabled={Boolean(actionKey)} onClick={() => setConfirmTarget({ kind: "booking", booking })} type="button"><Trash2 aria-hidden size={16} /><span>Удалить</span></button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-bookings"><CalendarCheck aria-hidden size={23} /><p>{bookings.length ? "По выбранному фильтру заявок нет." : "Новых заявок пока нет."}</p></div>}
          </>
        ) : guestStatusState === "loading" ? (
          <div aria-label="Проверяем последнюю заявку" className="booking-skeleton-list guest-status-skeleton" role="status">
            <span className="booking-skeleton" />
          </div>
        ) : guestStatusState === "error" ? (
          <div className="empty-bookings guest-status-error" role="alert">
            <AlertCircle aria-hidden size={23} />
            <p>{guestStatusMessage}</p>
            <button className="button button-secondary" onClick={() => void loadMine()} type="button"><RefreshCw aria-hidden size={17} /><span>Повторить</span></button>
          </div>
        ) : confirmation ? (
          <article className="booking-list-item booking-confirmation">
            <header><strong>Заявка #{confirmation.id.slice(0, 8)}</strong><BookingStatusLabel status={confirmation.status} /></header>
            <BookingDetails booking={confirmation} />
            {confirmation.comment ? <p className="booking-comment"><span>Комментарий</span>{confirmation.comment}</p> : null}
            <p className="guest-status-note">
              {confirmation.status === "pending" && "Заявка получена и ожидает решения администратора."}
              {confirmation.status === "accepted" && "Бронирование принято. Если нужно уточнение, свяжитесь с клубом."}
              {confirmation.status === "rejected" && "Заявка отклонена. Вы можете выбрать другое время."}
            </p>
          </article>
        ) : <div className="empty-bookings"><CalendarCheck aria-hidden size={23} /><p>После отправки здесь появятся детали и актуальный статус заявки.</p></div>}
        {adminMessage ? <div className={`form-message form-message-${adminMessageType}`} role={adminMessageType === "error" ? "alert" : "status"}>{adminMessage}</div> : null}
        {isAdmin && bookings.length ? <button className="clear-bookings" onClick={() => setConfirmTarget({ kind: "all" })} type="button"><Trash2 aria-hidden size={16} /><span>Удалить все заявки</span></button> : null}
      </Reveal>
      <ConfirmDialog busy={confirmBusy} onCancel={() => { if (!confirmBusy) setConfirmTarget(null); }} onConfirm={() => void confirmAction()} target={confirmTarget} />
    </InnerPage>
  );
}
