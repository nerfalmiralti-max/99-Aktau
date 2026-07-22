export const MIN_DURATION_HOURS = 1;
export const MAX_DURATION_HOURS = 12;
export const MAX_ACTIVE_BOOKINGS_PER_PHONE = 1;
export const AKTAU_UTC_OFFSET = "+05:00";

export const BOOKING_ROOMS = Object.freeze(["Основной зал", "VIP-зал"]);
export const BOOKING_TARIFFS = Object.freeze(["hourly", "promotion"]);

export const HOURLY_PRICES = Object.freeze({
  "Основной зал": 1000,
  "VIP-зал": 1500,
});

export const PROMOTION_PRICES = Object.freeze({
  "Основной зал": 2000,
  "VIP-зал": 3500,
});

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const HOUR_MS = 60 * 60 * 1000;
const AKTAU_OFFSET_MS = 5 * HOUR_MS;

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function assertValidDate(date) {
  if (typeof date !== "string") {
    throw new TypeError("Booking date must be a string in YYYY-MM-DD format");
  }

  const match = DATE_PATTERN.exec(date);
  if (!match) {
    throw new TypeError("Booking date must use YYYY-MM-DD format");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (year === 0 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new RangeError("Booking date is not a valid calendar date");
  }
}

function assertValidTime(time) {
  if (typeof time !== "string") {
    throw new TypeError("Booking time must be a string in HH:mm format");
  }

  const match = TIME_PATTERN.exec(time);
  if (!match) {
    throw new TypeError("Booking time must use HH:mm format");
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new RangeError("Booking time is outside the valid 00:00-23:59 range");
  }
}

function assertKnownRoom(room) {
  if (!BOOKING_ROOMS.includes(room)) {
    throw new RangeError(`Unknown booking room: ${String(room)}`);
  }
}

function assertKnownTariff(tariff) {
  if (!BOOKING_TARIFFS.includes(tariff)) {
    throw new RangeError(`Unknown booking tariff: ${String(tariff)}`);
  }
}

function toTimestamp(value, label) {
  let timestamp;

  if (value instanceof Date) {
    timestamp = value.getTime();
  } else if (typeof value === "number") {
    timestamp = value;
  } else if (typeof value === "string" && value.trim()) {
    timestamp = Date.parse(value);
  } else {
    throw new TypeError(`${label} must be a valid Date, timestamp, or date-time string`);
  }

  if (!Number.isFinite(timestamp)) {
    throw new RangeError(`${label} is not a valid date-time value`);
  }

  return timestamp;
}

export function isValidDurationHours(value) {
  return Number.isInteger(value)
    && value >= MIN_DURATION_HOURS
    && value <= MAX_DURATION_HOURS;
}

export function calculateBookingInterval(date, time, durationHours) {
  assertValidDate(date);
  assertValidTime(time);

  if (!isValidDurationHours(durationHours)) {
    throw new RangeError(
      `Booking duration must be a whole number from ${MIN_DURATION_HOURS} to ${MAX_DURATION_HOURS}`,
    );
  }

  // Treat the local wall-clock value as UTC for calendar arithmetic, then
  // subtract Aktau's fixed UTC+05:00 offset to produce the real instant.
  const localStartMs = Date.parse(`${date}T${time}:00.000Z`);
  const localEndMs = localStartMs + durationHours * HOUR_MS;
  const startAt = new Date(localStartMs - AKTAU_OFFSET_MS).toISOString();
  const endAt = new Date(localEndMs - AKTAU_OFFSET_MS).toISOString();
  const localEndIso = new Date(localEndMs).toISOString();
  const endDate = localEndIso.slice(0, 10);
  const endTime = localEndIso.slice(11, 16);

  return {
    startAt,
    endAt,
    endDate,
    endTime,
    crossesMidnight: endDate !== date,
  };
}

export function calculateBookingQuote(room, tariff, durationHours, date, time) {
  assertKnownRoom(room);
  assertKnownTariff(tariff);

  const interval = calculateBookingInterval(date, time, durationHours);
  const hourlyPrice = HOURLY_PRICES[room];
  const baseTotal = hourlyPrice * durationHours;

  if (tariff === "promotion") {
    if (durationHours !== 3) {
      throw new RangeError("The 2+1 promotion requires a duration of exactly 3 hours");
    }

    const [startHour, startMinute] = time.split(":").map(Number);
    if (startHour * 60 + startMinute + durationHours * 60 > 24 * 60) {
      throw new RangeError("The 2+1 promotion must end no later than local midnight");
    }

    const estimatedTotal = PROMOTION_PRICES[room];
    return {
      hourlyPrice,
      baseTotal,
      promotionDiscount: baseTotal - estimatedTotal,
      estimatedTotal,
      ...interval,
    };
  }

  return {
    hourlyPrice,
    baseTotal,
    promotionDiscount: 0,
    estimatedTotal: baseTotal,
    ...interval,
  };
}

export function intervalsOverlap(startA, endA, startB, endB) {
  const startATimestamp = toTimestamp(startA, "First interval start");
  const endATimestamp = toTimestamp(endA, "First interval end");
  const startBTimestamp = toTimestamp(startB, "Second interval start");
  const endBTimestamp = toTimestamp(endB, "Second interval end");

  if (endATimestamp <= startATimestamp || endBTimestamp <= startBTimestamp) {
    throw new RangeError("Each booking interval must end after it starts");
  }

  return startATimestamp < endBTimestamp && startBTimestamp < endATimestamp;
}
