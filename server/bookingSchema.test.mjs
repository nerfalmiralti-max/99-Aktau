import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const schemaUrl = new URL("../supabase/schema.sql", import.meta.url);
const migrationUrl = new URL(
  "../supabase/migrations/202607220001_booking_duration_and_conflicts.sql",
  import.meta.url,
);

test("booking schema and migration preserve the duration and price invariants", async () => {
  for (const source of await Promise.all([
    readFile(schemaUrl, "utf8"),
    readFile(migrationUrl, "utf8"),
  ])) {
    assert.match(source, /duration_hours between 1 and 12/i);
    assert.match(source, /end_at = start_at \+ make_interval\(hours => duration_hours\)/i);
    assert.match(source, /bookings_hourly_price_check/i);
    assert.match(source, /bookings_estimated_total_check/i);
    assert.match(source, /create_booking_request_v2/i);
    assert.match(source, /expected_total := expected_hourly_price \* p_duration_hours/i);
    assert.match(source, /p_duration_hours <> 3/i);
    assert.match(source, /proposed_end > promotion_deadline/i);
  }
});

test("database functions enforce limits, half-open overlap and safe status changes", async () => {
  const schema = await readFile(schemaUrl, "utf8");
  const migration = await readFile(migrationUrl, "utf8");
  for (const source of [schema, migration]) {
    assert.match(source, /status in \('pending', 'accepted'\)[\s\S]*?end_at > now\(\)[\s\S]*?\) >= 1 then\s+raise exception using errcode = 'P0001', message = 'ACTIVE_BOOKING_LIMIT'/i);
    assert.match(source, /start_at < proposed_end\s+and end_at > proposed_start/i);
    assert.match(source, /create or replace function public\.update_booking_status/i);
    assert.match(source, /message = 'BOOKING_INTERVAL_CONFLICT'/i);
    assert.match(source, /pg_advisory_xact_lock\(hashtextextended\('room:' \|\| p_room/i);
  }
});

test("migration is additive and retains the legacy RPC wrapper", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.match(migration, /create or replace function public\.create_booking_request\(/i);
  assert.match(migration, /return query select \* from public\.create_booking_request_v2/i);
  assert.match(migration, /^begin;/im);
  assert.match(migration, /^commit;/im);
});
