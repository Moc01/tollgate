import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Curio — AI search powered by Tollgate',
  description:
    'Ask anything. Watch your AI pay per source in USDC, on Solana, in real time.',
  openGraph: {
    title: 'Curio',
    description:
      'AI search agent powered by Tollgate. Per-source on-chain USDC settlement.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
