import { motion } from "framer-motion";
import { CalendarCheck, Check, CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  adminBookingApi,
  bookingApi,
  BookingApiError,
} from "../../services/booking/bookingApi";
import {
  BOOKING_ROOMS,
  BOOKING_STATUS_LABELS,
  BOOKING_TARIFF_LABELS,
  BOOKING_TARIFFS,
  getBookingPrice,
  type AdminBooking,
  type BookingInput,
  type BookingRequest,
  type BookingStatus,
} from "../../services/booking/types";
import { isBookingRoom } from "../../services/booking/bookingRules";
import { formatBookingDate, getLocalToday } from "../../utils/dateUtils";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";

type BookingProps = {
  isAdmin: boolean;
  onAdminSessionExpired: () => void;
};

type BookingErrors = Partial<Record<keyof BookingInput, string>>;
type SubmitState = "idle" | "loading" | "success" | "error";

const initialForm: BookingInput = {
  name: "",
  phone: "",
  date: "",
  time: "",
  room: BOOKING_ROOMS[0],
  tariff: BOOKING_TARIFFS[0],
  comment: "",
};

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isBookingTariff(value: string): value is BookingInput["tariff"] {
  return BOOKING_TARIFFS.some((tariff) => tariff === value);
}

function formatPrice(value: number) {
  return `${value.toLocaleString("ru-RU")} ₸`;
}

function BookingStatusLabel({ status }: { status: BookingStatus }) {
  return (
    <span className={`booking-status is-${status}`}>
      Статус: {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

export function Booking({ isAdmin, onAdminSessionExpired }: BookingProps) {
  const [form, setForm] = useState<BookingInput>(initialForm);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [confirmation, setConfirmation] = useState<BookingRequest | null>(null);
  const [adminBookings, setAdminBookings] = useState<AdminBooking[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const today = useMemo(() => getLocalToday(), []);
  const price = getBookingPrice(form.room, form.tariff);

  const loadMine = useCallback(async () => {
    try {
      setConfirmation(await bookingApi.mine());
    } catch {
      setConfirmation(null);
    }
  }, []);

  const loadAdminBookings = useCallback(async () => {
    setAdminLoading(true);
    setAdminMessage("");
    try {
      setAdminBookings(await adminBookingApi.list());
    } catch (error) {
      if (error instanceof BookingApiError && error.status === 401) {
        onAdminSessionExpired();
      } else {
        setAdminMessage(error instanceof Error ? error.message : "Не удалось загрузить заявки");
      }
    } finally {
      setAdminLoading(false);
    }
  }, [onAdminSessionExpired]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isAdmin) {
        void loadAdminBookings();
        return;
      }
      setAdminBookings([]);
      void loadMine();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAdmin, loadAdminBookings, loadMine]);

  const validate = (candidate: BookingInput) => {
    const nextErrors: BookingErrors = {};
    if (candidate.name.trim().length < 2) {
      nextErrors.name = "Введите имя.";
    }
    if (getPhoneDigits(candidate.phone).length < 10) {
      nextErrors.phone = "Введите корректный телефон.";
    }
    if (!candidate.date) {
      nextErrors.date = "Выберите дату.";
    } else if (candidate.date < today) {
      nextErrors.date = "Дата не может быть в прошлом.";
    }
    if (!candidate.time) {
      nextErrors.time = "Выберите время.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateField = <Field extends keyof BookingInput>(
    field: Field,
    value: BookingInput[Field],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const room = String(formData.get("room") ?? "");
    const tariff = String(formData.get("tariff") ?? "");
    const candidate: BookingInput = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      date: String(formData.get("date") ?? ""),
      time: String(formData.get("time") ?? ""),
      room: isBookingRoom(room) ? room : BOOKING_ROOMS[0],
      tariff: isBookingTariff(tariff) ? tariff : BOOKING_TARIFFS[0],
      comment: String(formData.get("comment") ?? ""),
    };
    setForm(candidate);

    if (!validate(candidate)) {
      setSubmitState("idle");
      setMessage("");
      return;
    }

    setSubmitState("loading");
    try {
      const result = await bookingApi.create({
        ...candidate,
        name: candidate.name.trim(),
        phone: candidate.phone.trim(),
        comment: candidate.comment.trim(),
      });
      setConfirmation(result.booking);
      setForm(initialForm);
      setSubmitState("success");
      setMessage(result.message);
      if (isAdmin) {
        await loadAdminBookings();
      }
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить заявку");
    }
  };

  const updateStatus = async (
    id: string,
    status: Exclude<BookingStatus, "pending">,
  ) => {
    setAdminMessage("");
    try {
      const updated = await adminBookingApi.updateStatus(id, status);
      setAdminBookings((current) => current.map((booking) => (
        booking.id === id ? updated : booking
      )));
    } catch (error) {
      if (error instanceof BookingApiError && error.status === 401) {
        onAdminSessionExpired();
      } else {
        setAdminMessage(error instanceof Error ? error.message : "Не удалось изменить статус");
      }
    }
  };

  const deleteBooking = async (id: string) => {
    setAdminMessage("");
    try {
      await adminBookingApi.delete(id);
      setAdminBookings((current) => current.filter((booking) => booking.id !== id));
    } catch (error) {
      if (error instanceof BookingApiError && error.status === 401) {
        onAdminSessionExpired();
      } else {
        setAdminMessage(error instanceof Error ? error.message : "Не удалось удалить заявку");
      }
    }
  };

  const clearBookings = async () => {
    if (!window.confirm("Удалить все заявки? Это действие нельзя отменить.")) {
      return;
    }
    setAdminMessage("");
    try {
      await adminBookingApi.clear();
      setAdminBookings([]);
    } catch (error) {
      if (error instanceof BookingApiError && error.status === 401) {
        onAdminSessionExpired();
      } else {
        setAdminMessage(error instanceof Error ? error.message : "Не удалось очистить заявки");
      }
    }
  };

  return (
    <section className="section booking-section" id="booking">
      <div className="container">
        <SectionHeader
          eyebrow="Бронирование"
          title="Оставьте заявку на удобный вечер."
          text="Выберите зал, тариф, дату и время — заявка сохранится и будет доступна после обновления страницы."
        />

        <div className="booking-layout">
          <Reveal>
            <form className="booking-form" onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <label>
                  <span>Имя</span>
                  <input
                    autoComplete="name"
                    className={errors.name ? "has-error" : ""}
                    name="name"
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Ваше имя"
                    required
                    value={form.name}
                  />
                  {errors.name ? <small>{errors.name}</small> : null}
                </label>
                <label>
                  <span>Телефон</span>
                  <input
                    autoComplete="tel"
                    className={errors.phone ? "has-error" : ""}
                    inputMode="tel"
                    name="phone"
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="+7"
                    required
                    value={form.phone}
                  />
                  {errors.phone ? <small>{errors.phone}</small> : null}
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>Дата</span>
                  <input
                    className={errors.date ? "has-error" : ""}
                    min={today}
                    name="date"
                    onChange={(event) => updateField("date", event.target.value)}
                    required
                    type="date"
                    value={form.date}
                  />
                  {errors.date ? <small>{errors.date}</small> : null}
                </label>
                <label>
                  <span>Время</span>
                  <input
                    className={errors.time ? "has-error" : ""}
                    name="time"
                    onChange={(event) => updateField("time", event.target.value)}
                    required
                    type="time"
                    value={form.time}
                  />
                  {errors.time ? <small>{errors.time}</small> : null}
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>Игровой зал</span>
                  <select
                    name="room"
                    onChange={(event) => {
                      if (isBookingRoom(event.target.value)) {
                        updateField("room", event.target.value);
                      }
                    }}
                    value={form.room}
                  >
                    {BOOKING_ROOMS.map((room) => <option key={room}>{room}</option>)}
                  </select>
                </label>
                <label>
                  <span>Тариф</span>
                  <select
                    name="tariff"
                    onChange={(event) => {
                      if (isBookingTariff(event.target.value)) {
                        updateField("tariff", event.target.value);
                      }
                    }}
                    value={form.tariff}
                  >
                    {BOOKING_TARIFFS.map((tariff) => (
                      <option key={tariff} value={tariff}>{BOOKING_TARIFF_LABELS[tariff]}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="booking-price-summary">
                <span>Итоговая стоимость</span>
                <strong>{formatPrice(price)}</strong>
              </div>

              <label>
                <span>Комментарий</span>
                <textarea
                  name="comment"
                  onChange={(event) => updateField("comment", event.target.value)}
                  placeholder="Пожелания по зоне или времени"
                  rows={4}
                  value={form.comment}
                />
              </label>

              <motion.button
                className="button button-primary form-submit"
                type="submit"
                disabled={submitState === "loading"}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{submitState === "loading" ? "Сохраняем" : "Сохранить заявку"}</span>
                {submitState === "loading"
                  ? <Loader2 className="spin" aria-hidden size={18} />
                  : <CalendarCheck aria-hidden size={18} />}
              </motion.button>

              {message ? (
                <div className={`form-message form-message-${submitState}`} role="status">
                  {submitState === "success" ? <CheckCircle2 aria-hidden size={18} /> : null}
                  <span>{message}</span>
                </div>
              ) : null}
            </form>
          </Reveal>

          <Reveal className="booking-panel" delay={0.1}>
            <span className="panel-kicker">{isAdmin ? "Режим администратора" : "Ваша заявка"}</span>
            <h3>{isAdmin ? "Все заявки клиентов" : "Текущая заявка"}</h3>

            {isAdmin ? (
              adminLoading ? (
                <p className="empty-bookings">Загружаем заявки…</p>
              ) : adminBookings.length ? (
                <div className="booking-list admin-booking-list">
                  {adminBookings.map((booking) => (
                    <article className="booking-list-item" key={booking.id}>
                      <strong>{booking.name}</strong>
                      <span>{booking.phone}</span>
                      <span>{formatBookingDate(booking.date)} · {booking.time}</span>
                      <span>{booking.room}</span>
                      <span>{BOOKING_TARIFF_LABELS[booking.tariff]} · {formatPrice(booking.price)}</span>
                      <BookingStatusLabel status={booking.status} />
                      <span>Создана: {new Date(booking.createdAt).toLocaleString("ru-RU")}</span>
                      {booking.comment ? <p>{booking.comment}</p> : null}
                      <div className="booking-admin-actions">
                        <button
                          disabled={booking.status === "accepted"}
                          onClick={() => void updateStatus(booking.id, "accepted")}
                          type="button"
                        >
                          <Check aria-hidden size={15} />
                          Принять
                        </button>
                        <button
                          disabled={booking.status === "rejected"}
                          onClick={() => void updateStatus(booking.id, "rejected")}
                          type="button"
                        >
                          <X aria-hidden size={15} />
                          Отклонить
                        </button>
                        <button onClick={() => void deleteBooking(booking.id)} type="button">
                          <Trash2 aria-hidden size={15} />
                          Удалить
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-bookings">Заявок пока нет.</p>
              )
            ) : confirmation ? (
              <article className="booking-list-item booking-confirmation">
                <strong>{confirmation.name}</strong>
                <span>{formatBookingDate(confirmation.date)} · {confirmation.time}</span>
                <span>{confirmation.room}</span>
                <span>{BOOKING_TARIFF_LABELS[confirmation.tariff]}</span>
                <span>{formatPrice(confirmation.price)}</span>
                <BookingStatusLabel status={confirmation.status} />
                {confirmation.comment ? <p>{confirmation.comment}</p> : null}
              </article>
            ) : (
              <p className="empty-bookings">После отправки здесь появится ваша заявка.</p>
            )}

            {adminMessage ? <div className="form-message form-message-error">{adminMessage}</div> : null}
            {isAdmin && adminBookings.length ? (
              <button className="clear-bookings" type="button" onClick={() => void clearBookings()}>
                <Trash2 aria-hidden size={16} />
                <span>Очистить список заявок</span>
              </button>
            ) : null}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
