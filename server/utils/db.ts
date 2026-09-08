import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { relations } from '../db/relations'
import * as schema from '../db/schema'

export { schema }

export type Db = ReturnType<typeof createDb>

function createDb(path: string) {
  mkdirSync(dirname(resolve(path)), { recursive: true })
  const db = drizzle({ connection: { path }, relations })
  db.$client.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  return db
}

let instance: Db | undefined

export function useDb(): Db {
  if (!instance) {
    const config = useRuntimeConfig()
    instance = createDb(config.databasePath)
    migrate(instance, { migrationsFolder: resolve(config.migrationsDir) })
  }
  return instance
}
