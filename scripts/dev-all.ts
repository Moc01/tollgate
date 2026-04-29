#!/usr/bin/env tsx
/**
 * Run settlement, examples, and curio dev servers concurrently.
 * Usage: pnpm dev
 */
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const ROOT = process.cwd()

interface Service {
  name: string
  cwd: string
  cmd: string
  args: string[]
  color: string
}

const services: Service[] = [
  {
    name: 'settlement',
    cwd: join(ROOT, 'apps/settlement'),
    cmd: 'pnpm',
    args: ['dev'],
    color: '\x1b[35m', // magenta
  },
  {
    name: 'examples  ',
    cwd: join(ROOT, 'apps/examples'),
    cmd: 'pnpm',
    args: ['dev'],
    color: '\x1b[36m', // cyan
  },
  {
    name: 'curio     ',
    cwd: join(ROOT, 'apps/curio'),
    cmd: 'pnpm',
    args: ['dev'],
    color: '\x1b[32m', // green
  },
]

const reset = '\x1b[0m'

const procs = services.map((s) => {
  const proc = spawn(s.cmd, s.args, {
    cwd: s.cwd,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  })

  const prefix = `${s.color}[${s.name}]${reset} `
  const tag = (line: string) =>
    line
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => prefix + l)
      .join('\n')

  proc.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(tag(data.toString()) + '\n')
  })
  proc.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(tag(data.toString()) + '\n')
  })
  proc.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`)
  })
  return { svc: s, proc }
})

const shutdown = () => {
  console.log('\nShutting down all services...')
  for (const { proc } of procs) proc.kill('SIGTERM')
  setTimeout(() => process.exit(0), 1000)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log('🚪 Tollgate dev — running 3 services')
console.log('   settlement: http://localhost:3001')
console.log('   examples:   http://localhost:4001')
console.log('   curio:      http://localhost:3002')
console.log('   Ctrl+C to stop all\n')
