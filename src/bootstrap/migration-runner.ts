// Migrations run synchronously in initDatabase() via CREATE TABLE IF NOT EXISTS + ALTER TABLE.
// This runner is retained as a no-op to avoid breaking any imports.
export async function runMigrationsIfAvailable(): Promise<void> {}

export default runMigrationsIfAvailable
