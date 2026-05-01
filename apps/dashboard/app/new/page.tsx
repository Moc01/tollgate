import { EndpointForm } from '@/components/EndpointForm'

export default function NewEndpointPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight">Register a paid endpoint</h1>
      <p className="mt-2 text-muted">
        Once registered, calls to this endpoint return a <code className="text-text">402 Payment Required</code> until
        the caller pays in USDC on Solana.
      </p>
      <div className="mt-8">
        <EndpointForm />
      </div>
    </div>
  )
}
