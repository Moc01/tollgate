'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEndpointAction } from '@/app/new/actions'

export function EndpointForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [splitsEnabled, setSplitsEnabled] = useState(false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
          const result = await createEndpointAction(fd)
          if (!result.ok) {
            setError(result.error)
            return
          }
          router.push(`/e/${encodeURIComponent(result.id)}`)
        })
      }}
      className="space-y-6"
    >
      <Field label="Endpoint id" hint="Stable id used as JWT audience. Example: my-search-v1">
        <input
          name="id"
          required
          pattern="[a-z0-9\-]+"
          maxLength={64}
          placeholder="my-search-v1"
          className="input"
        />
      </Field>

      <Field label="Display name">
        <input name="name" required maxLength={120} placeholder="My Search API" className="input" />
      </Field>

      <Field label="Description (optional)">
        <textarea
          name="description"
          rows={2}
          placeholder="Searches our private dataset of weather telemetry."
          className="input resize-none"
        />
      </Field>

      <Field
        label="URL pattern"
        hint="Public URL the agent will call. Glob `*` allowed."
      >
        <input
          name="urlPattern"
          required
          placeholder="https://api.example.com/v1/search*"
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price (USDC)" hint="0.0005 – 1.0">
          <input
            name="priceUsdc"
            required
            type="number"
            step="0.0001"
            min="0.0001"
            max="1.0"
            defaultValue="0.001"
            className="input tabular-nums"
          />
        </Field>
        <Field label="Token TTL (seconds)" hint="default 300">
          <input
            name="tokenTtl"
            type="number"
            min="30"
            max="86400"
            defaultValue="300"
            className="input tabular-nums"
          />
        </Field>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={splitsEnabled}
            onChange={(e) => setSplitsEnabled(e.target.checked)}
            className="rounded border-border bg-bg"
          />
          <span>Multi-recipient split</span>
          <span className="text-muted text-xs">(e.g., 3 maintainers share the revenue)</span>
        </label>

        {!splitsEnabled ? (
          <Field label="Recipient wallet (Solana base58)">
            <input
              name="recipient"
              required={!splitsEnabled}
              placeholder="BDqnQu..."
              className="input font-mono text-xs"
            />
          </Field>
        ) : (
          <Field
            label="Splits JSON"
            hint='Array of {wallet, share}. Shares must sum to 1. Example: [{"wallet":"BDq...","share":0.7},{"wallet":"Pla...","share":0.3}]'
          >
            <textarea
              name="splitsJson"
              rows={4}
              className="input font-mono text-xs"
              placeholder='[{"wallet":"BDq...","share":0.7},{"wallet":"Pla...","share":0.3}]'
            />
          </Field>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-md bg-accent hover:opacity-90 disabled:opacity-50 text-sm font-medium transition-opacity"
        >
          {pending ? 'Saving…' : 'Register endpoint'}
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: transparent;
          border: 1px solid #1f1f25;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          color: inherit;
          font-size: 0.875rem;
          outline: none;
        }
        :global(.input:focus) {
          border-color: #9945ff;
        }
      `}</style>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
