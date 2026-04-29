# Data Model

Postgres schema (Supabase). Drizzle ORM definitions live in `packages/shared/src/db/schema.ts`.

## Tables

### `users`

Provider users (people who registered an API endpoint). Fans / agent operators don't need accounts.

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT UNIQUE NOT NULL,
  email         TEXT,
  display_name  TEXT,
  solana_wallet TEXT NOT NULL,        -- their Privy embedded wallet
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(solana_wallet);
```

### `endpoints`

A registered, paid endpoint.

```sql
CREATE TABLE endpoints (
  id            TEXT PRIMARY KEY,                         -- e.g. "wiki-search-v1"
  owner_id      UUID NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  description   TEXT,
  url_pattern   TEXT NOT NULL,                            -- "https://wikipedia-pro.example.com/v1/search*"
  price_usdc    NUMERIC(20, 9) NOT NULL,                  -- USDC has 6 decimals, we store extra precision
  recipient     TEXT NOT NULL,                            -- Solana address; OR if splits, a marker
  splits        JSONB,                                    -- [{wallet, share}] | NULL
  token_ttl     INT NOT NULL DEFAULT 300,                 -- seconds
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_endpoints_owner ON endpoints(owner_id);
CREATE INDEX idx_endpoints_active ON endpoints(active) WHERE active;
```

### `intents`

A pending or completed payment intent.

```sql
CREATE TYPE intent_status AS ENUM ('pending', 'paid', 'expired', 'failed');

CREATE TABLE intents (
  id            TEXT PRIMARY KEY,                         -- "int_<random>"
  endpoint_id   TEXT NOT NULL REFERENCES endpoints(id),
  challenge     TEXT UNIQUE NOT NULL,                     -- the nonce embedded in 402; also the Solana Pay reference pubkey
  agent_pubkey  TEXT,                                     -- declared by agent in /v1/intent; verified at settlement
  price_usdc    NUMERIC(20, 9) NOT NULL,                  -- snapshot from endpoint at intent creation
  recipient     TEXT NOT NULL,
  splits        JSONB,
  status        intent_status NOT NULL DEFAULT 'pending',
  tx_signature  TEXT,                                     -- set when paid
  paid_at       TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intents_status ON intents(status, expires_at);
CREATE INDEX idx_intents_challenge ON intents(challenge);
CREATE INDEX idx_intents_endpoint_time ON intents(endpoint_id, created_at DESC);
```

### `tokens_issued`

Audit trail of access tokens.

```sql
CREATE TABLE tokens_issued (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id     TEXT NOT NULL REFERENCES intents(id),
  jti           TEXT UNIQUE NOT NULL,                     -- the JWT's jti claim, used for replay detection
  endpoint_id   TEXT NOT NULL,
  agent_pubkey  TEXT NOT NULL,
  issued_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_tokens_jti ON tokens_issued(jti);
```

### `calls`

A successful API call (after token redemption). Used for analytics on the dashboard.

```sql
CREATE TABLE calls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id   TEXT NOT NULL REFERENCES endpoints(id),
  intent_id     TEXT NOT NULL REFERENCES intents(id),
  agent_pubkey  TEXT NOT NULL,
  price_usdc    NUMERIC(20, 9) NOT NULL,
  user_agent    TEXT,
  status_code   INT,                                       -- 200, 4xx, 5xx
  latency_ms    INT,
  called_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_endpoint_time ON calls(endpoint_id, called_at DESC);
CREATE INDEX idx_calls_agent ON calls(agent_pubkey);
```

### `revenue_ledger`

A flattened record of who got paid what, for the dashboard.

```sql
CREATE TABLE revenue_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id     TEXT NOT NULL REFERENCES intents(id),
  endpoint_id   TEXT NOT NULL REFERENCES endpoints(id),
  recipient     TEXT NOT NULL,                            -- Solana address
  amount_usdc   NUMERIC(20, 9) NOT NULL,
  tx_signature  TEXT NOT NULL,
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_endpoint ON revenue_ledger(endpoint_id, recorded_at DESC);
CREATE INDEX idx_ledger_recipient ON revenue_ledger(recipient);
```

## Row-Level Security

```sql
-- Users see only their own profile
CREATE POLICY user_self ON users FOR SELECT USING (privy_user_id = current_setting('app.current_user'));

-- Endpoints visible only to owner
CREATE POLICY endpoint_owner ON endpoints FOR ALL
  USING (owner_id = (SELECT id FROM users WHERE privy_user_id = current_setting('app.current_user')));

-- Calls/ledger filtered by endpoint ownership
CREATE POLICY calls_owner ON calls FOR SELECT
  USING (endpoint_id IN (SELECT id FROM endpoints WHERE owner_id = (SELECT id FROM users WHERE privy_user_id = current_setting('app.current_user'))));
```

The settlement service uses a service-role key that bypasses RLS for system writes.

## Aggregations (materialized views)

For the dashboard's daily revenue chart we use a materialized view refreshed every 60 seconds:

```sql
CREATE MATERIALIZED VIEW endpoint_daily_stats AS
SELECT
  endpoint_id,
  DATE_TRUNC('day', called_at) AS day,
  COUNT(*) AS call_count,
  SUM(price_usdc) AS total_usdc,
  COUNT(DISTINCT agent_pubkey) AS unique_agents
FROM calls
GROUP BY endpoint_id, DATE_TRUNC('day', called_at);
```

## TypeScript Types

The Drizzle schema in `packages/shared/src/db/schema.ts` produces inferred types:

```typescript
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
export type Endpoint = InferSelectModel<typeof endpoints>
export type Intent = InferSelectModel<typeof intents>
export type Call = InferSelectModel<typeof calls>
```

These are re-exported from `@tollgate/shared` for use across all apps.

## Migrations

We use Drizzle's migration tool. Migration files live in `packages/shared/migrations/`. Run with:

```bash
pnpm db:generate   # diff schema → migration file
pnpm db:migrate    # apply pending migrations
```

For the hackathon we keep migrations simple: `drop and recreate` is acceptable on devnet.
