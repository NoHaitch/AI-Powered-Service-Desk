import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

const file = process.env.DESK_AUTH_TEST_PASSWORD_FILE
if (!file) throw new Error('The test stack must provision private synthetic passwords.')
const passwords = JSON.parse(readFileSync(file, 'utf-8')) as Record<string, string>

async function login(page: Page, username: string) {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(passwords[username])
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('employee submits and tracks an incident that only an authorized L1 agent can triage', async ({ browser, baseURL }) => {
  const employee = await browser.newContext({ baseURL })
  const other = await browser.newContext({ baseURL })
  const support = await browser.newContext({ baseURL })
  try {
    const maya = await employee.newPage()
    const jordan = await other.newPage()
    const alex = await support.newPage()
    await login(maya, 'maya')
    await expect(maya.getByRole('heading', { name: 'Welcome, Maya Chen' })).toBeVisible()
    await maya.getByRole('link', { name: 'Report an incident' }).click()
    await maya.getByRole('button', { name: 'Submit incident' }).click()
    await expect(maya.getByLabel('Summary')).toHaveAttribute('aria-invalid', 'true')
    const summary = `Browser incident ${randomUUID()}`
    const description = '<strong data-incident-probe="yes">Synthetic VPN disconnect</strong>'
    await maya.getByLabel('Summary').fill(summary)
    await maya.getByLabel('Description').fill(description)
    await maya.getByRole('checkbox', { name: 'Request prompt review' }).check()
    await maya.getByRole('button', { name: 'Submit incident' }).click()
    await expect(maya.getByText('Incident submitted')).toBeVisible()
    await expect(maya.getByText('Pending triage')).toBeVisible()
    await expect(maya.getByText(description, { exact: true })).toBeVisible()
    await expect(maya.locator('[data-incident-probe]')).toHaveCount(0)
    const detail = new URL(maya.url()).pathname
    await maya.reload()
    await expect(maya.getByRole('heading', { name: summary })).toBeVisible()
    await maya.getByRole('link', { name: 'Back to My Tickets' }).click()
    await expect(maya.getByRole('link', { name: summary })).toBeVisible()
    await maya.getByLabel('Show').selectOption('20')
    await expect(maya.getByRole('link', { name: summary })).toBeVisible()

    await login(jordan, 'jordan')
    await expect(jordan.getByRole('heading', { name: 'Welcome, Jordan Lee' })).toBeVisible()
    await jordan.goto(detail)
    await expect(jordan.getByRole('alert')).toContainText('This incident could not be found.')
    await jordan.goto('/workspace/queue')
    await expect(jordan.getByRole('heading', { name: 'Access denied' })).toBeVisible()

    await login(alex, 'alex')
    await expect(alex.getByRole('heading', { name: 'Welcome, Alex Morgan' })).toBeVisible()
    await alex.getByRole('link', { name: 'Open intake queue' }).click()
    await alex.getByRole('checkbox', { name: 'Flagged for prompt review only' }).check()
    await alex.getByRole('link', { name: summary }).click()
    await alex.getByLabel('Impact').selectOption('low')
    await alex.getByLabel('Urgency').selectOption('high')
    await expect(alex.getByText('P3', { exact: true })).toBeVisible()
    await alex.getByRole('button', { name: 'Complete triage' }).click()
    await expect(alex.getByText('Triage completed', { exact: true })).toBeVisible()
    await maya.goto(detail)
    await expect(maya.getByText('Triaged', { exact: true })).toBeVisible()
    await expect(maya.getByText('P3', { exact: true })).toBeVisible()
    await expect(maya.getByRole('button', { name: 'Complete triage' })).toHaveCount(0)
  } finally {
    await Promise.all([employee.close(), other.close(), support.close()])
  }
})

test('profile, genuine expiration, cross-tab refresh and family logout', async ({ context, page, baseURL }) => {
  await login(page, 'priya')
  await expect(page.getByRole('heading', { name: 'Welcome, Priya Shah' })).toBeVisible()
  const before = await context.cookies([`${baseURL}/api/v1/auth/refresh`])
  expect(before.filter(({ name }) => name.startsWith('__Secure-desk-')).length).toBe(2)
  expect(before.every(({ name, httpOnly, secure, sameSite }) => !name.startsWith('__Secure-desk-')
    || (httpOnly && secure && sameSite === 'Lax'))).toBe(true)
  expect(await page.evaluate(() => ({
    firstPartyCookies: document.cookie.includes('__Secure-desk-'),
    authStorage: [...Object.keys(localStorage), ...Object.keys(sessionStorage)].some(
      (key) => key.startsWith('service-desk.auth') || key.startsWith('service-desk.preview.persona'),
    ),
  }))).toEqual({ firstPartyCookies: false, authStorage: false })
  await expect.poll(async () => (await context.cookies([`${baseURL}/api/v1/auth/me`]))
    .some(({ name }) => name === '__Secure-desk-access'), {
    timeout: (Number(process.env.DESK_AUTH_TEST_ACCESS_SECONDS ?? 5) + 5) * 1000,
  }).toBe(false)

  const other = await context.newPage()
  let rotations = 0
  for (const tab of [page, other]) {
    tab.on('response', (response) => {
      if (response.url().endsWith('/auth/refresh') && response.request().method() === 'POST') rotations++
    })
  }
  await Promise.all([page.goto('/portal/profile'), other.goto('/portal/profile')])
  for (const tab of [page, other]) {
    await expect(tab.getByRole('heading', { name: 'Profile & preferences' })).toBeVisible()
    await expect(tab.getByRole('heading', { name: 'Session security' })).toBeVisible()
  }
  expect(rotations).toBe(1)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to Service Desk' })).toBeVisible()
  await expect(other.getByRole('heading', { name: 'Sign-in required' })).toBeVisible()
  expect((await context.cookies([`${baseURL}/api/v1/auth/me`]))
    .some(({ name }) => name.startsWith('__Secure-desk-'))).toBe(false)
})

test('disabled identities, explicit queue grants, and localized credential errors', async ({ browser, page, baseURL }) => {
  await login(page, 'taylor')
  await expect(page.getByRole('alert')).toContainText('The username or password is incorrect.')
  await login(page, 'drew')
  await page.getByRole('link', { name: 'Open intake queue' }).click()
  await expect(page.getByRole('alert')).toContainText('You do not have access to this action.')
  expect(await page.getByRole('link', { name: 'Edit knowledge' }).count()).toBe(0)
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to Service Desk' })).toBeVisible()

  const indonesia = await browser.newContext({ locale: 'id-ID', baseURL })
  try {
    const tab = await indonesia.newPage()
    await login(tab, 'quinn')
    await expect(tab.getByRole('alert')).toContainText('Nama pengguna atau kata sandi salah.')
  } finally {
    await indonesia.close()
  }
})
