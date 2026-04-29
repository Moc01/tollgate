import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/hono.ts',
    'src/express.ts',
    'src/node.ts',
    'src/next.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
  treeshake: true,
  external: ['express', 'hono', 'next'],
})
