import type { Migration } from "../migrations"

function createTable(): string {
  return `CREATE TABLE IF NOT EXISTS categories (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    color_hex      TEXT    NOT NULL DEFAULT '#CCCCCC',
    default_amount INTEGER,
    icon           TEXT    NOT NULL DEFAULT 'dots-horizontal',
    is_system      INTEGER NOT NULL DEFAULT 0
  )`
}

function seedDefaults(): string[] {
  const defaults = [
    { name: "Food", color: "#C97A4A", icon: "silverware-fork-knife" },
    { name: "Transport", color: "#4E9A6A", icon: "bus" },
    { name: "Groceries", color: "#C4A028", icon: "cart" },
    { name: "Utilities", color: "#3D7AB5", icon: "lightning-bolt" },
    { name: "Leisure", color: "#9050B8", icon: "movie-open" },
    { name: "Health", color: "#3E9E6A", icon: "medical-bag" },
    { name: "Shopping", color: "#C2664A", icon: "shopping" },
    { name: "Misc", color: "#7A7468", icon: "dots-horizontal" },
  ]

  return defaults.map(
    ({ name, color, icon }) =>
      `INSERT INTO categories (name, color_hex, default_amount, icon, is_system)
       SELECT '${name}', '${color}', NULL, '${icon}', 1
       WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '${name}')`,
  )
}

function up(): string[] {
  return [createTable(), ...seedDefaults()]
}

function down(): string[] {
  return [`DROP TABLE IF EXISTS categories`]
}

const migration: Migration = {
  id: 1,
  name: "2026_05_24_000001_create_categories_table",
  up,
  down,
}

export default migration
