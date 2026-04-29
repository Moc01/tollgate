'use client'

import { useEffect, useRef, useState } from 'react'

interface ToolCall {
  id: string
  name: string
  endpoint: string
  status: 'pending' | 'paying' | 'paid' | 'fetching' | 'done' | 'error'
  priceUsdc?: string
  txSignature?: string
  durationMs?: number
  resultCount?: number
}

interface AnswerStreamState {
  query: string
  status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error'
  toolCalls: ToolCall[]
  answer: string
  totalCostUsdc: number
  citations: Array<{ source: string; url: string }>
  errorMessage?: string
}

const SAMPLE_QUERIES = [
  "What's the latest research on Solana's Firedancer upgrade?",
  'How does HTTP 402 work and why is it relevant for AI agents?',
  "What's BlackRock's BUIDL fund, and how big is it on Solana?",
  'How big is the Solana stablecoin market right now?',
]

export function SearchExperience() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<AnswerStreamState>({
    query: '',
    status: 'idle',
    toolCalls: [],
    answer: '',
    totalCostUsdc: 0,
    citations: [],
  })

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim() || state.status === 'streaming' || state.status === 'thinking') return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({
      query,
      status: 'thinking',
      toolCalls: [],
      answer: '',
      totalCostUsdc: 0,
      citations: [],
    })

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        setState((s) => ({ ...s, status: 'error', errorMessage: text || `HTTP ${res.status}` }))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const evt of events) {
          if (!evt.startsWith('data: ')) continue
          const json = evt.slice(6).trim()
          if (!json) continue
          try {
            const parsed = JSON.parse(json) as StreamEvent
            applyEvent(setState, parsed)
          } catch {
            // ignore malformed
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setState((s) => ({
        ...s,
        status: 'error',
        errorMessage: (err as Error).message,
      }))
    }
  }

  return (
    <div className="mt-10">
      <form onSubmit={submit}>
        <div className="rounded-2xl border border-border bg-surface p-3 shadow-2xl shadow-black/40">
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="What do you want to know?"
            className="w-full resize-none bg-transparent border-0 px-3 py-3 text-base placeholder:text-muted focus:outline-none focus:ring-0"
            rows={2}
          />
          <div className="flex items-center justify-between px-3 pb-1">
            <div className="text-xs text-muted">
              <span className="hidden sm:inline">Press Enter to ask · Shift+Enter for newline</span>
            </div>
            <button
              type="submit"
              disabled={
                !query.trim() || state.status === 'thinking' || state.status === 'streaming'
              }
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {state.status === 'thinking' || state.status === 'streaming' ? 'Working…' : 'Ask'}
            </button>
          </div>
        </div>
      </form>

      {state.status === 'idle' && (
        <div className="mt-6 flex flex-wrap gap-2">
          {SAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="text-xs text-muted hover:text-text px-3 py-1.5 rounded-full border border-border hover:border-muted transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {state.status !== 'idle' && (
        <div className="mt-10 space-y-6">
          <ToolCallList calls={state.toolCalls} />
          <AnswerBlock state={state} />
          <CostBreakdown state={state} />
        </div>
      )}
    </div>
  )
}

function ToolCallList({ calls }: { calls: ToolCall[] }) {
  if (calls.length === 0) return null
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-muted mb-3">Sources queried</div>
      <ul className="space-y-2">
        {calls.map((c) => (
          <li key={c.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <StatusDot status={c.status} />
              <span className="font-mono text-text">{c.name}</span>
              <span className="text-muted text-xs">{c.endpoint}</span>
            </div>
            <div className="flex items-center gap-3">
              {c.priceUsdc && (
                <span
                  className={`tabular-nums text-xs ${
                    c.status === 'paid' || c.status === 'fetching' || c.status === 'done'
                      ? 'text-accent2'
                      : 'text-muted'
                  }`}
                >
                  paid ${c.priceUsdc}
                </span>
              )}
              {c.durationMs != null && (
                <span className="text-muted text-xs tabular-nums">{c.durationMs}ms</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusDot({ status }: { status: ToolCall['status'] }) {
  const color =
    status === 'paid' || status === 'fetching' || status === 'done'
      ? 'bg-accent2'
      : status === 'paying'
        ? 'bg-accent animate-pulse'
        : status === 'error'
          ? 'bg-red-500'
          : 'bg-border'
  return <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden />
}

function AnswerBlock({ state }: { state: AnswerStreamState }) {
  if (state.status === 'thinking' && !state.answer) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-muted">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Thinking through which sources to query…
        </div>
      </div>
    )
  }
  if (!state.answer && state.status !== 'streaming') return null
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
        {state.answer}
      </div>
      {state.status === 'streaming' && (
        <span className="inline-block ml-1 w-2 h-4 bg-accent animate-pulse align-middle" />
      )}
    </div>
  )
}

function CostBreakdown({ state }: { state: AnswerStreamState }) {
  const totalPaid = state.toolCalls
    .filter((c) => c.priceUsdc)
    .reduce((acc, c) => acc + Number(c.priceUsdc), 0)
  if (totalPaid === 0) return null
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-muted">Cost breakdown</div>
        <div className="tabular-nums text-text">
          Total: <span className="text-accent2">${totalPaid.toFixed(4)} USDC</span>
        </div>
      </div>
      <ul className="space-y-1">
        {state.toolCalls
          .filter((c) => c.priceUsdc)
          .map((c) => (
            <li key={c.id} className="flex items-center justify-between text-xs">
              <span className="text-muted">{c.name}</span>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-text">${c.priceUsdc}</span>
                {c.txSignature && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://explorer.solana.com/tx/${c.txSignature}?cluster=devnet`}
                    className="text-accent hover:underline"
                  >
                    on-chain →
                  </a>
                )}
              </div>
            </li>
          ))}
      </ul>
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted">
        Settled on Solana devnet · sub-second finality · sub-cent fees
      </div>
    </div>
  )
}

// ---------------- Stream protocol ----------------

type StreamEvent =
  | { type: 'thinking' }
  | { type: 'tool_call_start'; id: string; name: string; endpoint: string }
  | { type: 'tool_call_paying'; id: string; price_usdc: string }
  | { type: 'tool_call_paid'; id: string; tx_signature: string; duration_ms: number }
  | { type: 'tool_call_done'; id: string; result_count?: number }
  | { type: 'tool_call_error'; id: string; error: string }
  | { type: 'answer_chunk'; text: string }
  | { type: 'done' }
  | { type: 'error'; error: string }

function applyEvent(
  setState: React.Dispatch<React.SetStateAction<AnswerStreamState>>,
  e: StreamEvent,
) {
  setState((s) => {
    switch (e.type) {
      case 'thinking':
        return { ...s, status: 'thinking' }
      case 'tool_call_start':
        return {
          ...s,
          status: 'streaming',
          toolCalls: [
            ...s.toolCalls,
            { id: e.id, name: e.name, endpoint: e.endpoint, status: 'pending' },
          ],
        }
      case 'tool_call_paying':
        return {
          ...s,
          toolCalls: s.toolCalls.map((c) =>
            c.id === e.id ? { ...c, status: 'paying', priceUsdc: e.price_usdc } : c,
          ),
        }
      case 'tool_call_paid':
        return {
          ...s,
          toolCalls: s.toolCalls.map((c) =>
            c.id === e.id
              ? { ...c, status: 'paid', txSignature: e.tx_signature, durationMs: e.duration_ms }
              : c,
          ),
        }
      case 'tool_call_done':
        return {
          ...s,
          toolCalls: s.toolCalls.map((c) =>
            c.id === e.id ? { ...c, status: 'done', resultCount: e.result_count } : c,
          ),
        }
      case 'tool_call_error':
        return {
          ...s,
          toolCalls: s.toolCalls.map((c) => (c.id === e.id ? { ...c, status: 'error' } : c)),
        }
      case 'answer_chunk':
        return { ...s, status: 'streaming', answer: s.answer + e.text }
      case 'done':
        return { ...s, status: 'done' }
      case 'error':
        return { ...s, status: 'error', errorMessage: e.error }
    }
  })
}
