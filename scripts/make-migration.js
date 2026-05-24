#!/usr/bin/env node
// Usage: pnpm migrate:make <migration_name>
// Example: pnpm migrate:make create_budgets_table
//          pnpm migrate:make add_currency_column_to_expense_events

const fs = require("fs")
const path = require("path")

const MIGRATIONS_DIR = path.join(__dirname, "../src/shared/infrastructure/database/migrations")

const name = process.argv[2]

if (!name) {
  console.error("Usage: pnpm migrate:make <migration_name>")
  console.error("Examples:")
  console.error("  pnpm migrate:make create_budgets_table")
  console.error("  pnpm migrate:make add_currency_column_to_expense_events")
  process.exit(1)
}

if (!/^[a-z][a-z0-9_]*$/.test(name)) {
  console.error("Migration name must be lowercase letters, numbers, and underscores only.")
  process.exit(1)
}

// Determine next ID from existing migration files.
const existingFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".ts"))
const nextId = existingFiles.length + 1
const sequence = String(nextId).padStart(6, "0")

// Build filename using today's date + sequence + name.
const now = new Date()
const yyyy = now.getFullYear()
const mm = String(now.getMonth() + 1).padStart(2, "0")
const dd = String(now.getDate()).padStart(2, "0")
const datePart = `${yyyy}_${mm}_${dd}`
const fileName = `${datePart}_${sequence}_${name}.ts`
const migrationName = `${datePart}_${sequence}_${name}`

// Generate smart stubs based on naming convention.
const isCreate = name.startsWith("create_") && name.endsWith("_table")
const tableName = isCreate ? name.replace(/^create_/, "").replace(/_table$/, "") : null

const upBody = isCreate
  ? `  return [
    \`CREATE TABLE IF NOT EXISTS ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT
      -- TODO: add columns
    )\`,
  ]`
  : `  // TODO: add your up statements\n  return []`

const downBody = isCreate
  ? `  return [\`DROP TABLE IF EXISTS ${tableName}\`]`
  : `  // TODO: add your rollback statements\n  return []`

const template = `import type { Migration } from "../migrations"

function up(): string[] {
${upBody}
}

function down(): string[] {
${downBody}
}

const migration: Migration = {
  id: ${nextId},
  name: "${migrationName}",
  up,
  down,
}

export default migration
`

const filePath = path.join(MIGRATIONS_DIR, fileName)
fs.writeFileSync(filePath, template)

console.log(`✓ Created: src/shared/infrastructure/database/migrations/${fileName}`)
console.log("")
console.log("Next steps:")
console.log(`  1. Fill in the up and down statements in ${fileName}`)
console.log(`  2. Add the import to src/shared/infrastructure/database/migrations.ts:`)
console.log(`       import migration_${datePart.replace(/_/g, "")}_${sequence} from "./migrations/${migrationName}"`)
console.log(`  3. Append it to the MIGRATIONS array in that file.`)
