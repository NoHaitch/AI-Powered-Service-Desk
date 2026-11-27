import { defineConfig } from '@playwright/test'
import { dirname, join } from 'node:path'

const baseURL = process.env.DESK_AUTH_TEST_ORIGIN
if (!baseURL || !/^https:\/\/localhost:\d+$/.test(baseURL)) {
  throw new Error('Run backend/tests/run_m1_auth_https.sh to provision the local HTTPS test server.')
}
const spki = process.env.DESK_AUTH_TEST_BROWSER_SPKI
const passwords = process.env.DESK_AUTH_TEST_PASSWORD_FILE

export default defineConfig({
  testDir: './e2e',
  outputDir: passwords ? join(dirname(passwords), 'browser-results') : undefined,
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL,
    browserName: 'chromium',
    locale: 'en-US',
    ignoreHTTPSErrors: false,
    launchOptions: spki ? { args: [`--ignore-certificate-errors-spki-list=${spki}`] } : undefined,
  },
})
