import { runCurioAgent } from '@/lib/agent'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let body: { query?: string }
  try {
    body = (await req.json()) as { query?: string }
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  const query = (body.query ?? '').trim()
  if (!query) {
    return new Response('Empty query', { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (event: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        await runCurioAgent({
          query,
          emit: async (e) => send(e),
        })
      } catch (err) {
        send({ type: 'error', error: (err as Error).message ?? 'unknown' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  })
}
