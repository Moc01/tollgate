/**
 * Storage interface for the settlement service.
 *
 * Two implementations:
 *  - InMemoryStore: for tests + local dev without a database
 *  - PostgresStore: production, backed by Supabase
 */
import type { IntentStatus, RevenueSplit } from '@tollgate/shared'

export interface IntentRecord {
  id: string
  endpoint_id: string
  challenge: string
  agent_pubkey: string | null
  price_usdc: string
  recipient: string
  splits: RevenueSplit[] | null
  status: IntentStatus
  tx_signature: string | null
  paid_at: string | null
  expires_at: string
  created_at: string
}

export interface EndpointRow {
  id: string
  owner_id: string | null
  name: string
  description: string | null
  url_pattern: string
  price_usdc: string
  recipient: string
  splits: RevenueSplit[] | null
  token_ttl: number
  active: boolean
}

export interface Store {
  // Endpoints
  getEndpoint(id: string): Promise<EndpointRow | null>
  upsertEndpoint(row: EndpointRow): Promise<void>
  listEndpoints(ownerId?: string): Promise<EndpointRow[]>

  // Intents
  createIntent(row: Omit<IntentRecord, 'created_at'>): Promise<IntentRecord>
  getIntent(id: string): Promise<IntentRecord | null>
  getIntentByChallenge(challenge: string): Promise<IntentRecord | null>
  markIntentPaid(id: string, txSignature: string): Promise<IntentRecord | null>
  expireOldIntents(now: Date): Promise<number>

  // Tokens
  recordTokenIssued(args: {
    intentId: string
    jti: string
    endpointId: string
    agentPubkey: string
    expiresAt: string
  }): Promise<void>
  hasTokenWithJti(jti: string): Promise<boolean>

  // Calls (analytics)
  recordCall(args: {
    endpointId: string
    intentId: string
    agentPubkey: string
    priceUsdc: string
    statusCode?: number
    latencyMs?: number
    userAgent?: string
  }): Promise<void>

  // Ledger
  recordLedgerEntry(args: {
    intentId: string
    endpointId: string
    recipient: string
    amountUsdc: string
    txSignature: string
  }): Promise<void>
}

/** In-memory implementation, used for tests. */
export class InMemoryStore implements Store {
  private endpoints = new Map<string, EndpointRow>()
  private intents = new Map<string, IntentRecord>()
  private intentsByChallenge = new Map<string, string>()
  private tokenJtis = new Set<string>()
  private calls: Array<{
    endpointId: string
    intentId: string
    agentPubkey: string
    priceUsdc: string
    calledAt: string
  }> = []
  private ledger: Array<{
    intentId: string
    endpointId: string
    recipient: string
    amountUsdc: string
    txSignature: string
  }> = []

  async getEndpoint(id: string) {
    return this.endpoints.get(id) ?? null
  }
  async upsertEndpoint(row: EndpointRow) {
    this.endpoints.set(row.id, row)
  }
  async listEndpoints(ownerId?: string) {
    const all = Array.from(this.endpoints.values())
    return ownerId ? all.filter((e) => e.owner_id === ownerId) : all
  }

  async createIntent(row: Omit<IntentRecord, 'created_at'>) {
    const full: IntentRecord = { ...row, created_at: new Date().toISOString() }
    this.intents.set(full.id, full)
    this.intentsByChallenge.set(full.challenge, full.id)
    return full
  }
  async getIntent(id: string) {
    return this.intents.get(id) ?? null
  }
  async getIntentByChallenge(challenge: string) {
    const id = this.intentsByChallenge.get(challenge)
    return id ? (this.intents.get(id) ?? null) : null
  }
  async markIntentPaid(id: string, txSignature: string) {
    const intent = this.intents.get(id)
    if (!intent || intent.status === 'paid') return intent ?? null
    const updated: IntentRecord = {
      ...intent,
      status: 'paid',
      tx_signature: txSignature,
      paid_at: new Date().toISOString(),
    }
    this.intents.set(id, updated)
    return updated
  }
  async expireOldIntents(now: Date) {
    let n = 0
    for (const [id, intent] of this.intents) {
      if (intent.status === 'pending' && new Date(intent.expires_at) < now) {
        this.intents.set(id, { ...intent, status: 'expired' })
        n++
      }
    }
    return n
  }

  async recordTokenIssued(args: {
    intentId: string
    jti: string
    endpointId: string
    agentPubkey: string
    expiresAt: string
  }) {
    this.tokenJtis.add(args.jti)
  }
  async hasTokenWithJti(jti: string) {
    return this.tokenJtis.has(jti)
  }

  async recordCall(args: {
    endpointId: string
    intentId: string
    agentPubkey: string
    priceUsdc: string
  }) {
    this.calls.push({ ...args, calledAt: new Date().toISOString() })
  }

  async recordLedgerEntry(args: {
    intentId: string
    endpointId: string
    recipient: string
    amountUsdc: string
    txSignature: string
  }) {
    this.ledger.push(args)
  }

  // Test helpers
  _allIntents() {
    return Array.from(this.intents.values())
  }
  _allLedger() {
    return [...this.ledger]
  }
}
