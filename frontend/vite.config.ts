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
    proxy: backendOrigin ? { '^/api(?:/|$)': backendOrigin } : undefined,
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
