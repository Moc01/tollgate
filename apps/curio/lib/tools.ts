/**
 * Tool definitions for Curio's agent loop.
 *
 * Each tool corresponds to one of the 5 paid example APIs. The agent will
 * decide which subset to call given a user query.
 */

export interface CurioTool {
  /** Tool name as Claude sees it. */
  name: string
  /** Human-friendly display name. */
  displayName: string
  /** Description for the model. */
  description: string
  /** JSON schema for input. */
  input_schema: Record<string, unknown>
  /** Endpoint URL (relative path appended to EXAMPLES_BASE_URL). */
  path: string
  /** Display price (sourced from middleware config; informational only here). */
  priceDisplay: string
}

export const CURIO_TOOLS: CurioTool[] = [
  {
    name: 'search_news',
    displayName: 'NewsAPI Pro',
    description:
      'Search recent news headlines about Solana, AI agents, stablecoins, and the broader crypto ecosystem. Use when the user asks about recent events, announcements, or news.',
    input_schema: {
      type: 'object',
      properties: {
        q: {
          type: 'string',
          description: 'Search query keywords',
        },
        limit: {
          type: 'integer',
          description: 'Max number of results',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['q'],
    },
    path: '/api/news/',
    priceDisplay: '0.002',
  },
  {
    name: 'search_github',
    displayName: 'GitHub Search Pro',
    description:
      'Search GitHub repositories and code, especially for Solana ecosystem projects. Use when the user asks about open-source projects, libraries, or tools.',
    input_schema: {
      type: 'object',
      properties: {
        q: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['q'],
    },
    path: '/api/github/',
    priceDisplay: '0.001',
  },
  {
    name: 'lookup_wikipedia',
    displayName: 'Wikipedia API',
    description:
      'Look up encyclopedic background information on a topic (e.g. Solana, USDC, HTTP 402, AI agents). Use for foundational/definitional context.',
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'A short topic to look up',
        },
      },
      required: ['topic'],
    },
    path: '/api/wiki/',
    priceDisplay: '0.0005',
  },
  {
    name: 'search_arxiv',
    displayName: 'ArXiv Premium',
    description:
      'Search academic papers on AI agents, blockchain, stablecoins, programmable money, and related topics. Use when the user wants research depth.',
    input_schema: {
      type: 'object',
      properties: {
        q: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 5,
        },
      },
      required: ['q'],
    },
    path: '/api/arxiv/',
    priceDisplay: '0.003',
  },
  {
    name: 'search_solana_docs',
    displayName: 'Solana Docs Q&A',
    description:
      'Search the official Solana developer docs for technical answers about SPL tokens, Solana Pay, Blinks, transaction confirmation, and Confidential Token.',
    input_schema: {
      type: 'object',
      properties: {
        q: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 5,
        },
      },
      required: ['q'],
    },
    path: '/api/solana-docs/',
    priceDisplay: '0.0005',
  },
]

export function toolByName(name: string): CurioTool | undefined {
  return CURIO_TOOLS.find((t) => t.name === name)
}
