import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tollgate — HTTP 402 done right. For AI agents, on Solana.',
  description:
    'A Solana-native HTTP 402 protocol. Any API can charge AI agents per call in USDC, with one line of code. Live demo: Curio AI search.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: 'Tollgate',
    description:
      'The vending machine for AI agents. Pay-per-API-call in USDC on Solana.',
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
