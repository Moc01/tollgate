/**
 * Anthropic Claude tool-use integration.
 *
 * Wraps tool definitions so that when Claude requests a tool call whose
 * `url` field points to a Tollgate-paid endpoint, the agent SDK auto-pays
 * before forwarding the call.
 */
import type { AgentConfig } from '@tollgate/shared'
import { withTollgate } from './withTollgate'

/**
 * A "paid tool" definition — extends Anthropic's tool definition with a
 * `url` field that the wrapped fetch will hit.
 */
export interface PaidTool {
  /** Tool name as Claude sees it. */
  name: string
  /** Tool description for Claude. */
  description: string
  /** JSON Schema for the input. */
  input_schema: Record<string, unknown>
  /** HTTP endpoint URL that the tool calls. */
  url: string
  /** HTTP method, default POST. */
  method?: 'GET' | 'POST'
  /** Optional default headers for this endpoint. */
  headers?: Record<string, string>
}

/**
 * A tool runner takes Claude's `input` (parsed JSON) and returns the API
 * response body (already auto-paid).
 */
export type ToolRunner = (input: Record<string, unknown>) => Promise<unknown>

export interface WrappedTool {
  /** Anthropic tool definition (without the `url` extension). */
  definition: {
    name: string
    description: string
    input_schema: Record<string, unknown>
  }
  /** Function to invoke when Claude requests this tool. */
  run: ToolRunner
}

/**
 * Wrap a list of paid tools into Anthropic-compatible definitions plus runners.
 *
 * Usage:
 *
 * ```ts
 * const tools = wrapAnthropicTools([
 *   { name: 'wiki_search', description: '...', input_schema: {...},
 *     url: 'https://wiki-pro.example.com/search' },
 * ], { wallet, rpcUrl, maxPricePerCall: 0.01 })
 *
 * // Claude conversation:
 * const msg = await claude.messages.create({
 *   model: 'claude-sonnet-4-6',
 *   tools: tools.map(t => t.definition),
 *   ...,
 * })
 *
 * // When Claude returns tool_use blocks, dispatch to t.run:
 * for (const block of msg.content) {
 *   if (block.type === 'tool_use') {
 *     const tool = tools.find(t => t.definition.name === block.name)
 *     const result = await tool!.run(block.input as Record<string, unknown>)
 *     // ...feed result back to Claude
 *   }
 * }
 * ```
 */
export function wrapAnthropicTools(tools: PaidTool[], config: AgentConfig): WrappedTool[] {
  const paidFetch = withTollgate(globalThis.fetch, config)

  return tools.map((tool) => ({
    definition: {
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    },
    run: async (input: Record<string, unknown>) => {
      const method = tool.method ?? 'POST'
      const requestInit: RequestInit = {
        method,
        headers: {
          'content-type': 'application/json',
          ...(tool.headers ?? {}),
        },
      }

      let url = tool.url
      if (method === 'GET') {
        const params = new URLSearchParams()
        for (const [k, v] of Object.entries(input)) {
          if (v != null) params.set(k, String(v))
        }
        url += (url.includes('?') ? '&' : '?') + params.toString()
      } else {
        requestInit.body = JSON.stringify(input)
      }

      const res = await paidFetch(url, requestInit)
      if (!res.ok) {
        throw new Error(`Tool ${tool.name} failed: ${res.status} ${await res.text()}`)
      }
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) return res.json()
      return res.text()
    },
  }))
}
