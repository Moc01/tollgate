import {
  type TollgateDb,
  calls as callsTable,
  createDb,
  endpoints as endpointsTable,
  intents as intentsTable,
  revenueLedger as ledgerTable,
  tokensIssued as tokensTable,
} from '@tollgate/shared/db'
/**
 * Postgres-backed Store implementation, using Drizzle and the schema from
 * @tollgate/shared/db.
 */
import { and, eq, lt } from 'drizzle-orm'
import type { EndpointRow, IntentRecord, Store } from './store'

export class PostgresStore implements Store {
  private db: TollgateDb

  constructor(databaseUrl: string, opts: { edge?: boolean } = {}) {
    this.db = createDb({ url: databaseUrl, edge: opts.edge ?? false })
  }

  async getEndpoint(id: string): Promise<EndpointRow | null> {
    const rows = await this.db
      .select()
      .from(endpointsTable)
      .where(eq(endpointsTable.id, id))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return {
      id: row.id,
      owner_id: row.ownerId ?? null,
      name: row.name,
      description: row.description,
      url_pattern: row.urlPattern,
      price_usdc: row.priceUsdc,
      recipient: row.recipient,
      splits: row.splits,
      token_ttl: row.tokenTtl,
      active: row.active,
    }
  }

  async upsertEndpoint(row: EndpointRow): Promise<void> {
    await this.db
      .insert(endpointsTable)
      .values({
        id: row.id,
        ownerId: row.owner_id ?? '',
        name: row.name,
        description: row.description,
        urlPattern: row.url_pattern,
        priceUsdc: row.price_usdc,
        recipient: row.recipient,
        splits: row.splits,
        tokenTtl: row.token_ttl,
        active: row.active,
      })
      .onConflictDoUpdate({
        target: endpointsTable.id,
        set: {
          name: row.name,
          description: row.description,
          urlPattern: row.url_pattern,
          priceUsdc: row.price_usdc,
          recipient: row.recipient,
          splits: row.splits,
          tokenTtl: row.token_ttl,
          active: row.active,
          updatedAt: new Date(),
        },
      })
  }

  async listEndpoints(ownerId?: string): Promise<EndpointRow[]> {
    const rows = ownerId
      ? await this.db.select().from(endpointsTable).where(eq(endpointsTable.ownerId, ownerId))
      : await this.db.select().from(endpointsTable)
    return rows.map((row) => ({
      id: row.id,
      owner_id: row.ownerId ?? null,
      name: row.name,
      description: row.description,
      url_pattern: row.urlPattern,
      price_usdc: row.priceUsdc,
      recipient: row.recipient,
      splits: row.splits,
      token_ttl: row.tokenTtl,
      active: row.active,
    }))
  }

  async createIntent(row: Omit<IntentRecord, 'created_at'>): Promise<IntentRecord> {
    const inserted = await this.db
      .insert(intentsTable)
      .values({
        id: row.id,
        endpointId: row.endpoint_id,
        challenge: row.challenge,
        agentPubkey: row.agent_pubkey,
        priceUsdc: row.price_usdc,
        recipient: row.recipient,
        splits: row.splits,
        status: row.status,
        txSignature: row.tx_signature,
        paidAt: row.paid_at ? new Date(row.paid_at) : null,
        expiresAt: new Date(row.expires_at),
      })
      .returning()
    const r = inserted[0]
    if (!r) throw new Error('failed to insert intent')
    return rowToIntent(r)
  }

  async getIntent(id: string): Promise<IntentRecord | null> {
    const rows = await this.db.select().from(intentsTable).where(eq(intentsTable.id, id)).limit(1)
    return rows[0] ? rowToIntent(rows[0]) : null
  }

  async getIntentByChallenge(challenge: string): Promise<IntentRecord | null> {
    const rows = await this.db
      .select()
      .from(intentsTable)
      .where(eq(intentsTable.challenge, challenge))
      .limit(1)
    return rows[0] ? rowToIntent(rows[0]) : null
  }

  async markIntentPaid(id: string, txSignature: string): Promise<IntentRecord | null> {
    const updated = await this.db
      .update(intentsTable)
      .set({ status: 'paid', txSignature, paidAt: new Date() })
      .where(and(eq(intentsTable.id, id), eq(intentsTable.status, 'pending')))
      .returning()
    return updated[0] ? rowToIntent(updated[0]) : null
  }

  async expireOldIntents(now: Date): Promise<number> {
    const updated = await this.db
      .update(intentsTable)
      .set({ status: 'expired' })
      .where(and(eq(intentsTable.status, 'pending'), lt(intentsTable.expiresAt, now)))
      .returning({ id: intentsTable.id })
    return updated.length
  }

  async recordTokenIssued(args: {
    intentId: string
    jti: string
    endpointId: string
    agentPubkey: string
    expiresAt: string
  }): Promise<void> {
    await this.db.insert(tokensTable).values({
      intentId: args.intentId,
      jti: args.jti,
      endpointId: args.endpointId,
      agentPubkey: args.agentPubkey,
      expiresAt: new Date(args.expiresAt),
    })
  }

  async hasTokenWithJti(jti: string): Promise<boolean> {
    const rows = await this.db.select().from(tokensTable).where(eq(tokensTable.jti, jti)).limit(1)
    return rows.length > 0
  }

  async recordCall(args: {
    endpointId: string
    intentId: string
    agentPubkey: string
    priceUsdc: string
    statusCode?: number
    latencyMs?: number
    userAgent?: string
  }): Promise<void> {
    await this.db.insert(callsTable).values({
      endpointId: args.endpointId,
      intentId: args.intentId,
      agentPubkey: args.agentPubkey,
      priceUsdc: args.priceUsdc,
      statusCode: args.statusCode,
      latencyMs: args.latencyMs,
      userAgent: args.userAgent,
    })
  }

  async recordLedgerEntry(args: {
    intentId: string
    endpointId: string
    recipient: string
    amountUsdc: string
    txSignature: string
  }): Promise<void> {
    await this.db.insert(ledgerTable).values({
      intentId: args.intentId,
      endpointId: args.endpointId,
      recipient: args.recipient,
      amountUsdc: args.amountUsdc,
      txSignature: args.txSignature,
    })
  }
}

function rowToIntent(row: typeof intentsTable.$inferSelect): IntentRecord {
  return {
    id: row.id,
    endpoint_id: row.endpointId,
    challenge: row.challenge,
    agent_pubkey: row.agentPubkey ?? null,
    price_usdc: row.priceUsdc,
    recipient: row.recipient,
    splits: row.splits ?? null,
    status: row.status,
    tx_signature: row.txSignature ?? null,
    paid_at: row.paidAt ? row.paidAt.toISOString() : null,
    expires_at: row.expiresAt.toISOString(),
    created_at: row.createdAt.toISOString(),
  }
}
