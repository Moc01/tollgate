/**
 * Drizzle DB client factory.
 *
 * Usage:
 *   import { createDb } from '@tollgate/shared/db'
 *   const db = createDb(process.env.DATABASE_URL!)
 */
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export * from './schema'

export type TollgateDb = PostgresJsDatabase<typeof schema>

export interface DbOptions {
  /** Postgres connection string. */
  url: string
  /** Max number of connections. Default 10 for serverless, 1 for edge. */
  maxConnections?: number
  /** Whether the runtime is edge-style (single connection, no pooling). */
  edge?: boolean
}

export function createDb(opts: DbOptions): TollgateDb {
  const max = opts.edge ? 1 : (opts.maxConnections ?? 10)
  const client = postgres(opts.url, {
    max,
    prepare: !opts.edge, // edge runtime cannot use prepared statements
  })
  return drizzle(client, { schema })
}
