import Image from 'next/image'
import { SearchExperience } from '@/components/SearchExperience'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 sm:py-20">
      <header className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-12">
          <a
            href="https://github.com/Moc01/tollgate"
            className="flex items-center gap-3 group"
            aria-label="Tollgate"
          >
            <Image
              src="/logo.svg"
              alt="Tollgate"
              width={36}
              height={36}
              priority
              className="rounded-full"
            />
            <span className="flex flex-col leading-none">
              <span className="text-xl font-semibold tracking-tight">Tollgate</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted mt-1">
                Curio · live demo
              </span>
            </span>
          </a>
          <a
            href="https://github.com/Moc01/tollgate"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted hover:text-text transition-colors"
          >
            GitHub →
          </a>
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
          Ask anything. Watch your <span className="gradient-text">AI pay per source</span>, in real
          time.
        </h1>
        <p className="mt-4 text-muted text-lg">
          An AI research assistant where every source is a paid API. Each citation comes with a
          transparent cost breakdown, settled on Solana in stablecoins.
        </p>

        <SearchExperience />
      </header>

      <footer className="mt-24 text-sm text-muted text-center">
        Powered by{' '}
        <a className="underline hover:text-text" href="https://github.com/Moc01/tollgate">
          Tollgate
        </a>
        {' · '}HTTP 402 done right · Solana USDC microtransactions
      </footer>
    </main>
  )
}
