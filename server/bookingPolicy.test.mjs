import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AKTAU_UTC_OFFSET,
  HOURLY_PRICES,
  MAX_ACTIVE_BOOKINGS_PER_PHONE,
  MAX_DURATION_HOURS,
  MIN_DURATION_HOURS,
  PROMOTION_PRICES,
  calculateBookingInterval,
  calculateBookingQuote,
  intervalsOverlap,
  isValidDurationHours,
} from "../shared/bookingPolicy.mjs";

test("booking policy exposes the confirmed duration, limit and price rules", () => {
  assert.equal(MIN_DURATION_HOURS, 1);
  assert.equal(MAX_DURATION_HOURS, 12);
  assert.equal(MAX_ACTIVE_BOOKINGS_PER_PHONE, 1);
  assert.equal(AKTAU_UTC_OFFSET, "+05:00");
  assert.deepEqual(HOURLY_PRICES, { "Основной зал": 1000, "VIP-зал": 1500 });
  assert.deepEqual(PROMOTION_PRICES, { "Основной зал": 2000, "VIP-зал": 3500 });
});

test("duration accepts only whole hours from 1 through 12", () => {
  assert.equal(isValidDurationHours(1), true);
  assert.equal(isValidDurationHours(12), true);
  assert.equal(isValidDurationHours(0), false);
  assert.equal(isValidDurationHours(13), false);
  assert.equal(isValidDurationHours(1.5), false);
  assert.equal(isValidDurationHours("3"), false);

  assert.throws(
    () => calculateBookingInterval("2026-07-22", "19:00", 0),
    /whole number from 1 to 12/,
  );
  assert.throws(
    () => calculateBookingInterval("2026-07-22", "19:00", 13),
    /whole number from 1 to 12/,
  );
  assert.throws(
    () => calculateBookingInterval("2026-07-22", "19:00", 1.5),
    /whole number from 1 to 12/,
  );
});

test("interval calculation uses Aktau time and reports its local end", () => {
  assert.deepEqual(calculateBookingInterval("2026-07-22", "19:30", 3), {
    startAt: "2026-07-22T14:30:00.000Z",
    endAt: "2026-07-22T17:30:00.000Z",
    endDate: "2026-07-22",
    endTime: "22:30",
    crossesMidnight: false,
  });
});

test("interval calculation handles a local midnight crossing", () => {
  assert.deepEqual(calculateBookingInterval("2026-12-31", "23:30", 2), {
    startAt: "2026-12-31T18:30:00.000Z",
    endAt: "2026-12-31T20:30:00.000Z",
    endDate: "2027-01-01",
    endTime: "01:30",
    crossesMidnight: true,
  });
});

test("hourly quotes scale the confirmed room rate by duration", () => {
  assert.deepEqual(
    calculateBookingQuote("Основной зал", "hourly", 2, "2026-07-22", "18:00"),
    {
      hourlyPrice: 1000,
      baseTotal: 2000,
      promotionDiscount: 0,
      estimatedTotal: 2000,
      startAt: "2026-07-22T13:00:00.000Z",
      endAt: "2026-07-22T15:00:00.000Z",
      endDate: "2026-07-22",
      endTime: "20:00",
      crossesMidnight: false,
    },
  );

  const vipQuote = calculateBookingQuote("VIP-зал", "hourly", 12, "2026-07-22", "08:00");
  assert.equal(vipQuote.hourlyPrice, 1500);
  assert.equal(vipQuote.baseTotal, 18000);
  assert.equal(vipQuote.estimatedTotal, 18000);
});

test("2+1 promotion preserves confirmed totals and exposes the discount", () => {
  const mainQuote = calculateBookingQuote(
    "Основной зал",
    "promotion",
    3,
    "2026-07-22",
    "21:00",
  );
  assert.equal(mainQuote.baseTotal, 3000);
  assert.equal(mainQuote.promotionDiscount, 1000);
  assert.equal(mainQuote.estimatedTotal, 2000);
  assert.equal(mainQuote.endTime, "00:00");

  const vipQuote = calculateBookingQuote("VIP-зал", "promotion", 3, "2026-07-22", "18:00");
  assert.equal(vipQuote.baseTotal, 4500);
  assert.equal(vipQuote.promotionDiscount, 1000);
  assert.equal(vipQuote.estimatedTotal, 3500);
});

test("2+1 promotion requires exactly three hours and cannot run past midnight", () => {
  assert.throws(
    () => calculateBookingQuote("Основной зал", "promotion", 2, "2026-07-22", "18:00"),
    /exactly 3 hours/,
  );
  assert.throws(
    () => calculateBookingQuote("VIP-зал", "promotion", 3, "2026-07-22", "21:01"),
    /no later than local midnight/,
  );
});

test("overlap detection uses half-open intervals and allows adjacent bookings", () => {
  const firstStart = "2026-07-22T13:00:00.000Z";
  const firstEnd = "2026-07-22T15:00:00.000Z";

  assert.equal(
    intervalsOverlap(firstStart, firstEnd, "2026-07-22T14:00:00.000Z", "2026-07-22T16:00:00.000Z"),
    true,
  );
  assert.equal(
    intervalsOverlap(firstStart, firstEnd, "2026-07-22T12:00:00.000Z", "2026-07-22T16:00:00.000Z"),
    true,
  );
  assert.equal(
    intervalsOverlap(firstStart, firstEnd, firstStart, firstEnd),
    true,
  );
  assert.equal(
    intervalsOverlap(firstStart, firstEnd, firstEnd, "2026-07-22T17:00:00.000Z"),
    false,
  );
  assert.equal(
    intervalsOverlap("2026-07-22T11:00:00.000Z", firstStart, firstStart, firstEnd),
    false,
  );
});

test("booking policy rejects malformed calendar, time, room, tariff and interval data", () => {
  assert.throws(
    () => calculateBookingInterval("2026-02-29", "18:00", 1),
    /valid calendar date/,
  );
  assert.throws(
    () => calculateBookingInterval("2026-07-22", "24:00", 1),
    /valid 00:00-23:59 range/,
  );
  assert.throws(
    () => calculateBookingQuote("Другой зал", "hourly", 1, "2026-07-22", "18:00"),
    /Unknown booking room/,
  );
  assert.throws(
    () => calculateBookingQuote("Основной зал", "daily", 1, "2026-07-22", "18:00"),
    /Unknown booking tariff/,
  );
  assert.throws(
    () => intervalsOverlap("invalid", "2026-07-22T15:00:00Z", 1, 2),
    /not a valid date-time value/,
  );
  assert.throws(
    () => intervalsOverlap(2, 1, 3, 4),
    /must end after it starts/,
  );
});
