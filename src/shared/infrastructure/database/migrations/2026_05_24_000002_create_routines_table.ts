import type { Migration } from "../migrations"

function up(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS routines (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      name               TEXT    NOT NULL,
      category_id        INTEGER NOT NULL DEFAULT 0,
      time_start         INTEGER NOT NULL DEFAULT 0,
      time_end           INTEGER NOT NULL DEFAULT 1439,
      days_of_week       INTEGER NOT NULL DEFAULT 127,
      is_high_confidence INTEGER NOT NULL DEFAULT 0,
      default_amount     INTEGER NOT NULL DEFAULT 0,
      sort_order         INTEGER NOT NULL DEFAULT 0
    )`,
  ]
}

function down(): string[] {
  return [`DROP TABLE IF EXISTS routines`]
}

const migration: Migration = {
  id: 2,
  name: "2026_05_24_000002_create_routines_table",
  up,
  down,
}

export default migration
