/**
 * Curio's agent loop. Uses Anthropic Claude with tool_use, where every tool
 * is one of the 5 Tollgate-paid example APIs.
 */
import Anthropic from '@anthropic-ai/sdk'
import { Keypair } from '@solana/web3.js'
import { keypairWallet, withTollgate } from '@tollgate/agent'
import { walletFromBase58 } from '@tollgate/agent/wallet'
import { CURIO_TOOLS, toolByName } from './tools'

export interface CurioStreamEvent {
  type:
    | 'thinking'
    | 'tool_call_start'
    | 'tool_call_paying'
    | 'tool_call_paid'
    | 'tool_call_done'
    | 'tool_call_error'
    | 'answer_chunk'
    | 'done'
    | 'error'
  [key: string]: unknown
}

export type CurioEmit = (event: CurioStreamEvent) => void | Promise<void>

const SYSTEM_PROMPT = `You are Curio, an AI research assistant. You answer the user's question by calling 1–5 of the available paid sources, then synthesizing a concise, accurate answer with citations.

Rules:
1. Plan first. Decide which 1–5 sources are most likely to answer the question.
2. Call the chosen tools in PARALLEL when possible.
3. Cite sources with [1], [2], … in the answer body. After the body, list "Sources:" with one line per citation.
4. If a source returns nothing useful, say so transparently.
5. Keep the answer under ~200 words unless the user explicitly asks for length.
6. Mention costs only if the user asks ("Total cost: $0.00X USDC").
7. Never invent URLs or facts the sources didn't return.

Available sources cost between \$0.0005 and \$0.003 per call. Be frugal.`

export async function runCurioAgent(args: {
  query: string
  emit: CurioEmit
  /** Same-origin base URL when settlement/examples are bundled into this Next.js app. */
  selfBaseUrl?: string
}): Promise<void> {
  const { query, emit, selfBaseUrl } = args

  // Build paid fetch
  const wallet = loadAgentWallet()
  const rpcUrl =
    process.env.HELIUS_RPC_URL ??
    `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY ?? ''}`

  // When EXAMPLES_BASE_URL is unset, fall back to the request's own origin
  // (settlement + examples are mounted as Next.js api routes on this same host).
  const examplesBaseUrl =
    process.env.EXAMPLES_BASE_URL && process.env.EXAMPLES_BASE_URL !== ''
      ? process.env.EXAMPLES_BASE_URL
      : selfBaseUrl
        ? `${selfBaseUrl.replace(/\/$/, '')}/api/examples`
        : 'http://localhost:3002/api/examples'

  const paidFetch = withTollgate(globalThis.fetch, {
    wallet,
    rpcUrl,
    network: 'devnet',
    maxPricePerCall: 0.05,
    maxTotalSpend: 0.2,
    // In dev (no funded wallet), simulate the payment leg. Production should
    // unset this so real on-chain settlement happens.
    simulatePayment: process.env.CURIO_SIMULATE_PAYMENTS !== 'false',
    onPayment: async (info) => {
      // emitted from tool runner with proper id
    },
  })

  const claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const tools = CURIO_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Record<string, unknown> & { type: 'object' },
  }))

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: query }]

  await emit({ type: 'thinking' })

  for (let turn = 0; turn < 4; turn++) {
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: tools as Anthropic.Tool[],
      messages,
    })

    // Stop reason: "end_turn" means we're done; "tool_use" means we have tool calls.
    if (response.stop_reason === 'end_turn') {
      // Stream the final text
      for (const block of response.content) {
        if (block.type === 'text') {
          for (const chunk of chunkText(block.text)) {
            await emit({ type: 'answer_chunk', text: chunk })
          }
        }
      }
      await emit({ type: 'done' })
      return
    }

    // tool_use: dispatch each tool_use block in parallel
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    )

    if (toolUseBlocks.length === 0) {
      // unexpected; emit any text and bail
      for (const block of response.content) {
        if (block.type === 'text') {
          await emit({ type: 'answer_chunk', text: block.text })
        }
      }
      await emit({ type: 'done' })
      return
    }

    // Append the assistant message to history (with tool_use blocks)
    messages.push({ role: 'assistant', content: response.content })

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        const tool = toolByName(block.name)
        if (!tool) {
          await emit({ type: 'tool_call_error', id: block.id, error: 'unknown_tool' })
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: 'Tool not found.',
            is_error: true,
          }
        }

        const fullUrl = examplesBaseUrl.replace(/\/$/, '') + tool.path

        await emit({
          type: 'tool_call_start',
          id: block.id,
          name: tool.displayName,
          endpoint: fullUrl,
        })

        const start = Date.now()
        try {
          const params = new URLSearchParams()
          const input = block.input as Record<string, unknown>
          for (const [k, v] of Object.entries(input)) {
            if (v != null) params.set(k, String(v))
          }
          const url = `${fullUrl}?${params.toString()}`

          // Pre-emit "paying" with the published price so UI updates instantly.
          await emit({ type: 'tool_call_paying', id: block.id, price_usdc: tool.priceDisplay })

          const res = await paidFetch(url, { method: 'GET' })

          if (!res.ok) {
            const t = await res.text().catch(() => '')
            await emit({ type: 'tool_call_error', id: block.id, error: t || `HTTP ${res.status}` })
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: `Error: ${t || res.status}`,
              is_error: true,
            }
          }

          const json = (await res.json()) as { results?: unknown[]; article?: unknown }
          const count = (json.results as unknown[] | undefined)?.length ?? (json.article ? 1 : 0)

          // We don't know the on-chain tx signature here unless we use onPayment;
          // emit a paid event with empty signature for UI purposes.
          await emit({
            type: 'tool_call_paid',
            id: block.id,
            tx_signature: '',
            duration_ms: Date.now() - start,
          })

          await emit({
            type: 'tool_call_done',
            id: block.id,
            result_count: count,
          })

          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(json),
          }
        } catch (err) {
          const msg = (err as Error).message
          await emit({ type: 'tool_call_error', id: block.id, error: msg })
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: `Error: ${msg}`,
            is_error: true,
          }
        }
      }),
    )

    messages.push({
      role: 'user',
      content: toolResults,
    })
  }

  // Max turns hit
  await emit({ type: 'error', error: 'Max conversation turns exceeded' })
}

function chunkText(text: string): string[] {
  // Split into ~80 char chunks for smoother streaming UX
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += 80) {
    chunks.push(text.slice(i, i + 80))
  }
  return chunks
}

function loadAgentWallet() {
  const secret = process.env.CURIO_AGENT_SECRET_KEY
  if (secret) {
    try {
      return walletFromBase58(secret)
    } catch (err) {
      console.warn('Failed to parse CURIO_AGENT_SECRET_KEY, using ephemeral wallet:', err)
    }
  }
  // Ephemeral wallet for local dev; in prod we want a stable funded wallet.
  return keypairWallet(Keypair.generate())
}
