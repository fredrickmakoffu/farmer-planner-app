import type { Migration } from "../migrations"

function up(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS outbox (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      payload    TEXT    NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  ]
}

function down(): string[] {
  return [`DROP TABLE IF EXISTS outbox`]
}

const migration: Migration = {
  id: 4,
  name: "2026_05_24_000004_create_outbox_table",
  up,
  down,
}

export default migration
