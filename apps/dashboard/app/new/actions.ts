'use server'

import { upsertEndpoint } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export async function createEndpointAction(
  fd: FormData,
): Promise<{ ok: true; id: string } | { ok: false; id: string; error: string }> {
  const id = String(fd.get('id') ?? '').trim()
  const name = String(fd.get('name') ?? '').trim()
  const description = (fd.get('description') as string | null)?.trim() || undefined
  const urlPattern = String(fd.get('urlPattern') ?? '').trim()
  const priceUsdc = String(fd.get('priceUsdc') ?? '').trim()
  const tokenTtl = Number(fd.get('tokenTtl') ?? 300)
  const recipient = (fd.get('recipient') as string | null)?.trim()
  const splitsJsonRaw = (fd.get('splitsJson') as string | null)?.trim()

  if (!id || !name || !urlPattern || !priceUsdc) {
    return { ok: false, id, error: 'Missing required fields' }
  }

  let splits: Array<{ wallet: string; share: number }> | undefined
  if (splitsJsonRaw) {
    try {
      splits = JSON.parse(splitsJsonRaw) as Array<{ wallet: string; share: number }>
    } catch {
      return { ok: false, id, error: 'Splits JSON is invalid' }
    }
  }

  const result = await upsertEndpoint({
    id,
    name,
    description,
    urlPattern,
    priceUsdc,
    recipient: splits ? undefined : recipient,
    splits,
    tokenTtl: Number.isFinite(tokenTtl) ? tokenTtl : 300,
    active: true,
  })

  if (!result.ok) {
    return { ok: false, id, error: result.error ?? 'Unknown error' }
  }

  revalidatePath('/')
  return { ok: true, id }
}
