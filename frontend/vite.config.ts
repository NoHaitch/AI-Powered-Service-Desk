import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const backendOrigin = process.env.DESK_BACKEND_ORIGIN
const certificate = process.env.DESK_TLS_CERT_FILE
const privateKey = process.env.DESK_TLS_KEY_FILE

if (Boolean(certificate) !== Boolean(privateKey)) {
  throw new Error('Both DESK_TLS_CERT_FILE and DESK_TLS_KEY_FILE are required for HTTPS.')
}

export default defineConfig({
  server: {
    https: certificate && privateKey
      ? { cert: readFileSync(certificate), key: readFileSync(privateKey) }
      : undefined,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    },
    proxy: backendOrigin ? {
      '^/api(?:/|$)': {
        target: backendOrigin,
        proxyTimeout: 10000,
        configure(proxy) {
          proxy.on('proxyReq', (outgoing, incoming) => {
            outgoing.removeHeader('Forwarded')
            outgoing.removeHeader('X-Forwarded-For')
            outgoing.setHeader('X-Desk-Client-Address', incoming.socket.remoteAddress ?? '')
          })
          proxy.on('error', (_error, _incoming, outgoing) => {
            if (!('writeHead' in outgoing) || outgoing.headersSent || outgoing.writableEnded) return
            const requestId = randomUUID()
            outgoing.writeHead(503, {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
              'X-Request-ID': requestId,
            }).end(JSON.stringify({
              code: 'unavailable', message: 'The API is unavailable.', request_id: requestId,
            }))
          })
        },
      },
    } : undefined,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  devtools: {
    apply: 'serve',
  },
  plugins: [
    react(),
    tailwindcss()
  ],
})
