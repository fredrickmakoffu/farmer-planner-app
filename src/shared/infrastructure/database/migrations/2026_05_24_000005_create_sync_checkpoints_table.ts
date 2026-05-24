import type { Migration } from "../migrations"

function up(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS sync_checkpoints (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      last_synced_at INTEGER
    )`,
  ]
}

function down(): string[] {
  return [`DROP TABLE IF EXISTS sync_checkpoints`]
}

const migration: Migration = {
  id: 5,
  name: "2026_05_24_000005_create_sync_checkpoints_table",
  up,
  down,
}

export default migration
