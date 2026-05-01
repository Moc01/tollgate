import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tollgate Dashboard',
  description: 'Register paid HTTP endpoints. Watch USDC settle on Solana in real time.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <header className="border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-accent2" />
              <span className="font-semibold tracking-tight">Tollgate</span>
              <span className="text-muted text-sm">Dashboard</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/" className="text-muted hover:text-text transition-colors">
                Endpoints
              </Link>
              <Link
                href="/new"
                className="px-3 py-1 rounded-md bg-accent hover:opacity-90 text-sm font-medium transition-opacity"
              >
                + New endpoint
              </Link>
              <a
                href="https://github.com/Moc01/tollgate"
                target="_blank"
                rel="noreferrer"
                className="text-muted hover:text-text transition-colors"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
