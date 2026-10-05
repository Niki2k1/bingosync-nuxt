import { useDb as useWervtDb } from '@wervt/nuxt/server'
import { relations } from '../db/relations'
import * as schema from '../db/schema'

export { schema }

export type Db = ReturnType<typeof useDb>

/** The app's Postgres (provisioned and migrated by wervt) with relational queries. */
export function useDb() {
  return useWervtDb({ relations })
}
