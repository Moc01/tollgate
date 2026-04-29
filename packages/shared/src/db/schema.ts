/**
 * Drizzle schema for Tollgate Postgres (Supabase).
 * See `docs/DATA_MODEL.md` for design rationale.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { RevenueSplit } from '../types'

export const intentStatusEnum = pgEnum('intent_status', ['pending', 'paid', 'expired', 'failed'])

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    privyUserId: text('privy_user_id').notNull(),
    email: text('email'),
    displayName: text('display_name'),
    solanaWallet: text('solana_wallet').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    privyUserIdUnique: uniqueIndex('users_privy_user_id_unique').on(t.privyUserId),
    walletIdx: index('users_wallet_idx').on(t.solanaWallet),
  }),
)

export const endpoints = pgTable(
  'endpoints',
  {
    id: text('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    urlPattern: text('url_pattern').notNull(),
    priceUsdc: numeric('price_usdc', { precision: 20, scale: 9 }).notNull(),
    recipient: text('recipient').notNull(),
    splits: jsonb('splits').$type<RevenueSplit[] | null>(),
    tokenTtl: integer('token_ttl').notNull().default(300),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    ownerIdx: index('endpoints_owner_idx').on(t.ownerId),
    activeIdx: index('endpoints_active_idx').on(t.active),
  }),
)

export const intents = pgTable(
  'intents',
  {
    id: text('id').primaryKey(),
    endpointId: text('endpoint_id')
      .notNull()
      .references(() => endpoints.id, { onDelete: 'restrict' }),
    challenge: text('challenge').notNull(),
    agentPubkey: text('agent_pubkey'),
    priceUsdc: numeric('price_usdc', { precision: 20, scale: 9 }).notNull(),
    recipient: text('recipient').notNull(),
    splits: jsonb('splits').$type<RevenueSplit[] | null>(),
    status: intentStatusEnum('status').notNull().default('pending'),
    txSignature: text('tx_signature'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    challengeUnique: uniqueIndex('intents_challenge_unique').on(t.challenge),
    statusIdx: index('intents_status_idx').on(t.status, t.expiresAt),
    endpointTimeIdx: index('intents_endpoint_time_idx').on(t.endpointId, t.createdAt),
  }),
)

export const tokensIssued = pgTable(
  'tokens_issued',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    intentId: text('intent_id')
      .notNull()
      .references(() => intents.id, { onDelete: 'restrict' }),
    jti: text('jti').notNull(),
    endpointId: text('endpoint_id').notNull(),
    agentPubkey: text('agent_pubkey').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    jtiUnique: uniqueIndex('tokens_jti_unique').on(t.jti),
  }),
)

export const calls = pgTable(
  'calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    endpointId: text('endpoint_id')
      .notNull()
      .references(() => endpoints.id, { onDelete: 'restrict' }),
    intentId: text('intent_id')
      .notNull()
      .references(() => intents.id, { onDelete: 'restrict' }),
    agentPubkey: text('agent_pubkey').notNull(),
    priceUsdc: numeric('price_usdc', { precision: 20, scale: 9 }).notNull(),
    userAgent: text('user_agent'),
    statusCode: integer('status_code'),
    latencyMs: integer('latency_ms'),
    calledAt: timestamp('called_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    endpointTimeIdx: index('calls_endpoint_time_idx').on(t.endpointId, t.calledAt),
    agentIdx: index('calls_agent_idx').on(t.agentPubkey),
  }),
)

export const revenueLedger = pgTable(
  'revenue_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    intentId: text('intent_id')
      .notNull()
      .references(() => intents.id, { onDelete: 'restrict' }),
    endpointId: text('endpoint_id')
      .notNull()
      .references(() => endpoints.id, { onDelete: 'restrict' }),
    recipient: text('recipient').notNull(),
    amountUsdc: numeric('amount_usdc', { precision: 20, scale: 9 }).notNull(),
    txSignature: text('tx_signature').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    endpointIdx: index('ledger_endpoint_idx').on(t.endpointId, t.recordedAt),
    recipientIdx: index('ledger_recipient_idx').on(t.recipient),
  }),
)

// Drizzle inferred types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Endpoint = typeof endpoints.$inferSelect
export type NewEndpoint = typeof endpoints.$inferInsert
export type Intent = typeof intents.$inferSelect
export type NewIntent = typeof intents.$inferInsert
export type TokenIssued = typeof tokensIssued.$inferSelect
export type Call = typeof calls.$inferSelect
export type NewCall = typeof calls.$inferInsert
export type LedgerEntry = typeof revenueLedger.$inferSelect
