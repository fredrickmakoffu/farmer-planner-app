import type { Migration } from "../migrations"

function up(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS expense_events (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      amount       INTEGER NOT NULL,
      category_id  INTEGER,
      created_at   INTEGER NOT NULL,
      confirmed_at INTEGER,
      notes        TEXT
    )`,
  ]
}

function down(): string[] {
  return [`DROP TABLE IF EXISTS expense_events`]
}

const migration: Migration = {
  id: 3,
  name: "2026_05_24_000003_create_expense_events_table",
  up,
  down,
}

export default migration
