import cloudflare from '@astrojs/cloudflare'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, sessionDrivers } from 'astro/config'
import { fileURLToPath } from 'node:url'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))
const reactRuntimeDeps = [
  'react', 'react-dom', 'react-dom/client', 'react-dom/server',
  'react/jsx-runtime', 'react/jsx-dev-runtime',
]
const optimizerExcludes = ['@kiwa-ui/enhance', '@kiwa-ui/enhance/accordion', '@radix-ui/react-slot', 'turndown']

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://ilo.so',
  adapter: cloudflare({ configPath: './wrangler.jsonc', imageService: 'passthrough', prerenderEnvironment: 'node' }),
  integrations: [react(), mdx()],
  output: 'server',
  session: { driver: sessionDrivers.lruCache() },
  trailingSlash: 'never',
  srcDir: './src/astro',
  vite: {
    configFile: false,
    plugins: [tailwindcss()],
    optimizeDeps: { include: [...reactRuntimeDeps, 'astro/virtual-modules/transitions.js', '@phosphor-icons/react', 'lucide', 'lucide-react'], exclude: optimizerExcludes },
    ssr: { optimizeDeps: { exclude: [...optimizerExcludes, 'class-variance-authority', 'clsx', 'tailwind-merge'] } },
    resolve: { dedupe: ['react', 'react-dom'], alias: { '@': srcDir } },
  },
})
