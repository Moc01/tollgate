/**
 * Mock data for the 5 paid example APIs.
 *
 * In a real product these would query upstream services (real Wikipedia,
 * GitHub, ArXiv etc). For the hackathon we keep them static and snappy so
 * the Curio demo is deterministic and 100% reliable on a slow network.
 */

export interface SearchHit {
  title: string
  snippet: string
  url: string
  source: string
}

const SOLANA_TOPICS = [
  'solana',
  'firedancer',
  'usdc',
  'depin',
  'jupiter',
  'phantom',
  'helius',
  'pyth',
]
const AI_TOPICS = ['ai agent', 'llm', 'mcp', 'tool use', 'function calling']

function matches(text: string, query: string): boolean {
  const q = query.toLowerCase()
  return text.toLowerCase().includes(q)
}

// ----------------------------- News -----------------------------
export const NEWS: SearchHit[] = [
  {
    title: 'Solana Frontier Hackathon Officially Launched with $2.75M in Prizes',
    snippet:
      'Colosseum kicked off the Solana Frontier Hackathon on April 6, 2026. The five-week event awards a $30K Grand Champion prize plus 20 $10K standout awards.',
    url: 'https://blog.colosseum.com/announcing-the-solana-frontier-hackathon/',
    source: 'Colosseum Blog',
  },
  {
    title: 'Firedancer Validator Hits Devnet with Sub-150ms Finality',
    snippet:
      "Anza's Firedancer client recorded sub-150ms finality on Solana devnet during stress tests last week, validating the Alpenglow upgrade thesis.",
    url: 'https://solana.com/news/firedancer-devnet',
    source: 'Solana News',
  },
  {
    title: 'Stablecoin Volume on Solana Crosses $650B/Month',
    snippet:
      'Solana processed $650 billion in stablecoin transactions in February 2026, more than doubling its prior record and leading all blockchains.',
    url: 'https://solana.com/news/state-of-solana-february-2026',
    source: 'State of Solana',
  },
  {
    title: 'Goldman Sachs Discloses $108M in SOL Holdings',
    snippet:
      'Goldman Sachs revealed $108M in SOL on its Q4 institutional holdings filing, a 35% quarter-over-quarter increase.',
    url: 'https://solana.com/news/state-of-solana-february-2026',
    source: 'State of Solana',
  },
  {
    title: 'AI Agents Begin Generating Measurable On-chain Economic Output',
    snippet:
      'Solana sub-cent fees and sub-second finality are powering a new wave of autonomous AI agents transacting in stablecoins.',
    url: 'https://blog.colosseum.com/ai-agent-economy/',
    source: 'Colosseum Blog',
  },
  {
    title: 'BlackRock BUIDL Fund Crosses $550M on Solana',
    snippet:
      "BlackRock's tokenized treasury fund BUIDL surpassed half a billion dollars in TVL on Solana in February.",
    url: 'https://solana.com/news/state-of-solana-february-2026',
    source: 'State of Solana',
  },
  {
    title: 'Tollgate Protocol Demos HTTP 402 for AI Commerce',
    snippet:
      'A new open-source protocol called Tollgate makes it possible for AI agents to pay APIs in USDC stablecoins on Solana, with one line of code.',
    url: 'https://github.com/Moc01/tollgate',
    source: 'Hacker News',
  },
]

// ----------------------------- GitHub -----------------------------
export const GITHUB_REPOS: SearchHit[] = [
  {
    title: 'solana-labs/solana',
    snippet:
      'Web-Scale Blockchain for fast, secure, scalable, decentralized apps and marketplaces. ~13.2k stars, Rust.',
    url: 'https://github.com/solana-labs/solana',
    source: 'GitHub',
  },
  {
    title: 'firedancer-io/firedancer',
    snippet:
      'New Solana validator client written in C, focused on performance and throughput. ~2.1k stars.',
    url: 'https://github.com/firedancer-io/firedancer',
    source: 'GitHub',
  },
  {
    title: 'helius-labs/helius-sdk',
    snippet: 'TypeScript SDK for the Helius RPC and webhooks. ~640 stars.',
    url: 'https://github.com/helius-labs/helius-sdk',
    source: 'GitHub',
  },
  {
    title: 'metaplex-foundation/mpl-core',
    snippet: 'The next generation Metaplex digital asset standard. ~480 stars.',
    url: 'https://github.com/metaplex-foundation/mpl-core',
    source: 'GitHub',
  },
  {
    title: 'jup-ag/jupiter-swap-api-client',
    snippet: 'TypeScript / Rust client for the Jupiter aggregator. ~1.1k stars.',
    url: 'https://github.com/jup-ag/jupiter-swap-api-client',
    source: 'GitHub',
  },
  {
    title: 'Moc01/tollgate',
    snippet:
      'Solana-native HTTP 402 payment protocol — one line of code to charge AI agents in USDC.',
    url: 'https://github.com/Moc01/tollgate',
    source: 'GitHub',
  },
  {
    title: 'anza-xyz/agave',
    snippet:
      'The Solana validator client maintained by Anza, formerly known as solana-labs/solana. ~720 stars.',
    url: 'https://github.com/anza-xyz/agave',
    source: 'GitHub',
  },
]

// ----------------------------- Wikipedia -----------------------------
export const WIKI_ARTICLES: Record<string, SearchHit> = {
  solana: {
    title: 'Solana (blockchain platform)',
    snippet:
      'Solana is a public, open-source blockchain platform that uses a proof-of-history consensus mechanism. It is designed to support smart contracts and high-throughput decentralized applications.',
    url: 'https://en.wikipedia.org/wiki/Solana_(blockchain_platform)',
    source: 'Wikipedia',
  },
  usdc: {
    title: 'USD Coin (USDC)',
    snippet:
      'USD Coin (USDC) is a digital stablecoin pegged 1:1 to the U.S. dollar, issued by Circle. It runs natively on Solana, Ethereum, and other chains.',
    url: 'https://en.wikipedia.org/wiki/USD_Coin',
    source: 'Wikipedia',
  },
  http402: {
    title: 'HTTP 402 Payment Required',
    snippet:
      'HTTP 402 Payment Required is a status code defined in RFC 7231 §6.5.2. The status was reserved for future use and has historically been little-used. New protocols, such as Solana-native Tollgate-402, leverage it for machine-to-machine commerce.',
    url: 'https://en.wikipedia.org/wiki/List_of_HTTP_status_codes',
    source: 'Wikipedia',
  },
  stablecoin: {
    title: 'Stablecoin',
    snippet:
      'A stablecoin is a type of cryptocurrency where the value is pegged to a reference asset, often the U.S. dollar. As of 2026 the global stablecoin supply exceeds $200 billion.',
    url: 'https://en.wikipedia.org/wiki/Stablecoin',
    source: 'Wikipedia',
  },
  ai_agent: {
    title: 'AI agent',
    snippet:
      'An AI agent is a software system that can perceive its environment, take actions, and pursue goals. Modern AI agents based on large language models can use tools, browse the web, and increasingly transact on-chain.',
    url: 'https://en.wikipedia.org/wiki/Intelligent_agent',
    source: 'Wikipedia',
  },
}

// ----------------------------- ArXiv -----------------------------
export const ARXIV_PAPERS: SearchHit[] = [
  {
    title: 'Towards Verifiable Multi-Agent AI Systems with On-chain Settlement',
    snippet:
      'We propose an architecture in which autonomous AI agents transact stablecoin payments on a public blockchain to coordinate multi-agent workflows. arXiv:2602.04123',
    url: 'https://arxiv.org/abs/2602.04123',
    source: 'arXiv',
  },
  {
    title: 'Programmable Money for AI: A Survey',
    snippet:
      'We survey the rapidly emerging field of programmable money for autonomous agents, including discussions of HTTP 402 protocols, tokenized API economies, and on-chain reputation. arXiv:2601.99012',
    url: 'https://arxiv.org/abs/2601.99012',
    source: 'arXiv',
  },
  {
    title: 'Sub-second Consensus for High-throughput Blockchains',
    snippet:
      'We analyze recent advances in consensus protocols achieving sub-second finality, including Alpenglow on Solana. arXiv:2511.07621',
    url: 'https://arxiv.org/abs/2511.07621',
    source: 'arXiv',
  },
  {
    title: 'Stablecoin Microtransactions and the API Economy',
    snippet:
      'This paper estimates the addressable market for sub-cent API microtransactions, projecting a $50 billion market by 2027 driven by autonomous agents. arXiv:2603.03102',
    url: 'https://arxiv.org/abs/2603.03102',
    source: 'arXiv',
  },
  {
    title: 'Confidential SPL Token: Privacy-Preserving Stablecoin Payments on Solana',
    snippet:
      "We describe Arcium's Confidential SPL Token standard for private payments on Solana, suitable for institutional and consumer use cases. arXiv:2602.55512",
    url: 'https://arxiv.org/abs/2602.55512',
    source: 'arXiv',
  },
]

// ----------------------------- Solana Docs -----------------------------
export const SOLANA_DOCS: SearchHit[] = [
  {
    title: 'Solana Pay specification',
    snippet:
      'Solana Pay is an open standard for embedding Solana payment transactions in URLs. The spec defines a `solana:` URI scheme with parameters for recipient, amount, spl-token, and reference public keys.',
    url: 'https://docs.solanapay.com/spec',
    source: 'Solana Docs',
  },
  {
    title: 'SPL Token Program',
    snippet:
      'The SPL Token Program is the standard Solana fungible token program. USDC, USDT, JupSOL, and most other tokens are SPL tokens.',
    url: 'https://spl.solana.com/token',
    source: 'Solana Docs',
  },
  {
    title: 'Actions and Blinks',
    snippet:
      'Solana Actions are HTTP API endpoints that produce signable transactions. Blinks are shareable URLs that wallets render as inline UIs.',
    url: 'https://solana.com/developers/guides/advanced/actions',
    source: 'Solana Docs',
  },
  {
    title: 'Transaction confirmation and commitment',
    snippet:
      'Solana commitment levels are processed (~400ms), confirmed (1–2s), and finalized (~13s with current params, far less under Alpenglow).',
    url: 'https://solana.com/docs/core/transactions/confirmation',
    source: 'Solana Docs',
  },
  {
    title: 'Confidential SPL Token',
    snippet:
      'A new SPL Token extension that enables encrypted balances and amounts using zero-knowledge proofs while maintaining a familiar developer experience.',
    url: 'https://solana.com/docs/extensions/confidential',
    source: 'Solana Docs',
  },
]

// ----------------------------- Search helpers -----------------------------

export function searchAll(items: SearchHit[], query: string, limit = 5): SearchHit[] {
  // Empty query (no q param) — return a sample so curl-only callers see what's
  // available. This is the only path that returns content without a match.
  if (!query.trim()) return items.slice(0, limit)

  const q = query.toLowerCase()
  const scored = items
    .map((item) => {
      let score = 0
      if (item.title.toLowerCase().includes(q)) score += 3
      if (item.snippet.toLowerCase().includes(q)) score += 1
      // bonus for related topic words
      for (const t of SOLANA_TOPICS)
        if (q.includes(t) && (item.title + item.snippet).toLowerCase().includes(t)) score += 1
      for (const t of AI_TOPICS)
        if (q.includes(t) && (item.title + item.snippet).toLowerCase().includes(t)) score += 1
      return { item, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  // For non-empty queries that match nothing: return [] rather than silently
  // padding with unrelated Solana content. This keeps citations honest — the
  // agent will see zero results and tell the user transparently. Real-world
  // APIs behave the same way (and still charge for the lookup).
  return scored.map((s) => s.item)
}

export function searchWiki(query: string): SearchHit | null {
  const q = query.toLowerCase().trim()
  for (const [key, article] of Object.entries(WIKI_ARTICLES)) {
    if (q.includes(key) || matches(article.title, query) || matches(article.snippet, query)) {
      return article
    }
  }
  return null
}
