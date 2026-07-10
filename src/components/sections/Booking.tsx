import { motion } from "framer-motion";
import { CalendarCheck, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  bookingRepository,
  bookingRepositoryMode,
} from "../../services/booking/bookingRepository";
import {
  BOOKING_RETENTION_MS,
  BookingLimitError,
  isBookingRoom,
} from "../../services/booking/bookingRules";
import { BOOKING_ROOMS, type BookingInput, type BookingRequest } from "../../services/booking/types";
import { formatBookingDate, getLocalToday } from "../../utils/dateUtils";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";

type BookingErrors = Partial<Record<keyof BookingInput, string>>;
type SubmitState = "idle" | "loading" | "success" | "error";

const initialForm: BookingInput = {
  name: "",
  phone: "",
  date: "",
  time: "",
  room: BOOKING_ROOMS[0],
  comment: "",
};

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function Booking() {
  const [form, setForm] = useState<BookingInput>(initialForm);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [message, setMessage] = useState("");
  const today = useMemo(() => getLocalToday(), []);

  useEffect(() => {
    bookingRepository.list().then(setBookings).catch(() => setBookings([]));
  }, []);

  useEffect(() => {
    if (!bookings.length) {
      return undefined;
    }

    const nextExpiration = Math.min(
      ...bookings.map((booking) => Date.parse(booking.createdAt) + BOOKING_RETENTION_MS),
    );
    const delay = Math.max(0, nextExpiration - Date.now()) + 50;
    const timer = window.setTimeout(() => {
      bookingRepository.list().then(setBookings).catch(() => setBookings([]));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [bookings]);

  const validate = (candidate: BookingInput) => {
    const nextErrors: BookingErrors = {};

    if (candidate.name.trim().length < 2) {
      nextErrors.name = "Введите имя.";
    }

    if (getPhoneDigits(candidate.phone).length < 7) {
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

  const updateField = <Field extends keyof BookingInput,>(
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
    const candidate: BookingInput = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      date: String(formData.get("date") ?? ""),
      time: String(formData.get("time") ?? ""),
      room: isBookingRoom(room) ? room : BOOKING_ROOMS[0],
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
      const booking = await bookingRepository.create({
        name: candidate.name.trim(),
        phone: candidate.phone.trim(),
        date: candidate.date,
        time: candidate.time,
        room: candidate.room,
        comment: candidate.comment.trim(),
      });
      const updatedBookings = await bookingRepository.list();
      setBookings(updatedBookings);
      setForm(initialForm);
      setSubmitState("success");
      setMessage(
        bookingRepositoryMode === "supabase"
          ? `Заявка ${booking.id.slice(0, 8)} отправлена.`
          : `Заявка ${booking.id.slice(0, 8)} временно сохранена в этом браузере.`,
      );
    } catch (error) {
      setSubmitState("error");
      setMessage(
        error instanceof BookingLimitError
          ? error.message
          : "Не удалось сохранить заявку. Проверьте данные и попробуйте еще раз.",
      );
    }
  };

  const clearLocalBookings = async () => {
    if (!bookingRepository.clear) {
      return;
    }

    await bookingRepository.clear();
    setBookings([]);
    setMessage("Локальные заявки очищены.");
    setSubmitState("success");
  };

  return (
    <section className="section booking-section" id="booking">
      <div className="container">
        <SectionHeader
          eyebrow="Бронирование"
          title="Оставьте заявку на удобный вечер."
          text="Форма уже работает локально и готова к подключению Supabase без изменения пользовательского сценария."
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
                  {BOOKING_ROOMS.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </label>

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
                {submitState === "loading" ? (
                  <Loader2 className="spin" aria-hidden size={18} />
                ) : (
                  <CalendarCheck aria-hidden size={18} />
                )}
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
            <span className="panel-kicker">
              {bookingRepositoryMode === "supabase" ? "Онлайн-заявки" : "Временный режим"}
            </span>
            <h3>Заявки в этом браузере</h3>
            {bookings.length ? (
              <div className="booking-list">
                {bookings.slice(0, 4).map((booking) => (
                  <article className="booking-list-item" key={booking.id}>
                    <strong>{booking.name}</strong>
                    <span>
                      {formatBookingDate(booking.date)} · {booking.time}
                    </span>
                    <span>{booking.room}</span>
                    <span>{booking.phone}</span>
                    {booking.comment ? <p>{booking.comment}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-bookings">После отправки заявки она появится здесь.</p>
            )}

            {bookingRepository.clear && bookings.length ? (
              <button className="clear-bookings" type="button" onClick={clearLocalBookings}>
                <Trash2 aria-hidden size={16} />
                <span>Очистить локальные заявки</span>
              </button>
            ) : null}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
