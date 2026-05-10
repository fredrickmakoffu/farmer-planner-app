import { initDatabase } from "@/shared/infrastructure/database"

import { container } from "./container"
import { createQueryClient } from "./query-client"
import registerInfrastructure from "./register-infrastructure"
import SqliteSyncEngine from "../shared/infrastructure/sqlite-sync-engine"

export const queryClient = createQueryClient()

export async function initAppBootstrap(): Promise<void> {
  console.debug("BOOTSTRAP: initAppBootstrap() starting")

  const db = initDatabase()
  console.debug("BOOTSTRAP: initDatabase() finished")

  container.register("database", db)
  registerInfrastructure(db)
  console.debug("BOOTSTRAP: registerInfrastructure done")

  try {
    const sync = new SqliteSyncEngine(db)
    container.register("syncEngine", sync)
    console.debug("BOOTSTRAP: syncEngine registered")
  } catch (err) {
    console.error("BOOTSTRAP: failed to register syncEngine", err)
  }
}

export default {
  queryClient,
  init: initAppBootstrap,
}
