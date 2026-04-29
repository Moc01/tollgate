/**
 * OpenAI function-calling integration.
 *
 * Wraps function definitions so that when GPT requests a function call
 * whose `url` field points to a Tollgate-paid endpoint, the agent SDK
 * auto-pays before forwarding the call.
 */
import type { AgentConfig } from '@tollgate/shared'
import { withTollgate } from './withTollgate'

export interface PaidFunction {
  /** Function name. */
  name: string
  /** Description for the model. */
  description: string
  /** JSON Schema for the parameters. */
  parameters: Record<string, unknown>
  /** Endpoint URL. */
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
}

export interface WrappedFunction {
  definition: {
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }
  run: (input: Record<string, unknown>) => Promise<unknown>
}

export function wrapOpenAIFunctions(fns: PaidFunction[], config: AgentConfig): WrappedFunction[] {
  const paidFetch = withTollgate(globalThis.fetch, config)

  return fns.map((fn) => ({
    definition: {
      type: 'function' as const,
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      },
    },
    run: async (input: Record<string, unknown>) => {
      const method = fn.method ?? 'POST'
      const requestInit: RequestInit = {
        method,
        headers: {
          'content-type': 'application/json',
          ...(fn.headers ?? {}),
        },
      }

      let url = fn.url
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
        throw new Error(`Function ${fn.name} failed: ${res.status} ${await res.text()}`)
      }
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) return res.json()
      return res.text()
    },
  }))
}
