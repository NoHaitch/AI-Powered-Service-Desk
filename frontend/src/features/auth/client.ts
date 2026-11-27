const authRoot = '/api/v1/auth'
const channelName = 'service-desk.auth'
const lockName = 'service-desk.session'
let csrf: string | undefined
let restoring: Promise<Identity | null> | undefined
let refreshOutcomeUnknown = false
let retryAt = 0

export type Role = 'employee' | 'agent' | 'administrator'
export type Identity = { id: string; display_name: string; roles: Role[] }
type Csrf = { csrf_token: string }

export class ApiError extends Error {
  readonly status: number
  readonly retryAfter: number | undefined

  constructor(status: number, retryAfter?: number) {
    super('The API request could not be completed.')
    this.status = status
    this.retryAfter = retryAfter
  }
}

const messages = {
  en: {
    invalidLogin: 'The username or password is incorrect.',
    expired: 'Your session has ended. Please sign in again.',
    forbidden: 'You do not have access to this action.',
    notFound: 'This incident could not be found.',
    conflict: 'The incident changed. Reload to see its current status.',
    invalid: 'Check the information you entered and try again.',
    limited: 'Too many attempts. Wait before trying again.',
    unavailable: 'The service is temporarily unavailable. Try again shortly.',
    uncertain: 'The result could not be confirmed. Check the current state before trying again.',
  },
  id: {
    invalidLogin: 'Nama pengguna atau kata sandi salah.',
    expired: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
    forbidden: 'Anda tidak memiliki akses untuk melakukan tindakan ini.',
    notFound: 'Insiden ini tidak ditemukan.',
    conflict: 'Insiden telah berubah. Muat ulang untuk melihat status terbaru.',
    invalid: 'Periksa informasi yang Anda masukkan dan coba lagi.',
    limited: 'Terlalu banyak percobaan. Tunggu sebelum mencoba lagi.',
    unavailable: 'Layanan untuk sementara tidak tersedia. Coba lagi nanti.',
    uncertain: 'Hasil belum dapat dipastikan. Periksa status saat ini sebelum mencoba lagi.',
  },
}

export function errorMessage(error: unknown, login = false) {
  const language = (globalThis.navigator?.language ?? 'en').split('-')[0]
  const labels = language === 'id' ? messages.id : messages.en
  if (!(error instanceof ApiError)) return labels.uncertain
  switch (error.status) {
    case 401: return login ? labels.invalidLogin : labels.expired
    case 403: return labels.forbidden
    case 404: return labels.notFound
    case 409: return labels.conflict
    case 413:
    case 422: return labels.invalid
    case 429: return labels.limited
    case 503: return labels.unavailable
    default: return labels.uncertain
  }
}

async function send(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
  })
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    throw new ApiError(response.status, retryAfter > 0 ? retryAfter : undefined)
  }
  return response
}

async function currentUser(): Promise<Identity | null> {
  try {
    return await (await send(`${authRoot}/me`)).json() as Identity
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

async function getCsrf() {
  const result = await (await send(`${authRoot}/csrf`)).json() as Csrf
  csrf = result.csrf_token
  return csrf
}

function authChanged() {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(channelName)
  channel.postMessage('session-changed')
  channel.close()
}

export function subscribeAuthChanges(onChange: () => void) {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const channel = new BroadcastChannel(channelName)
  channel.onmessage = ({ data }) => {
    if (data !== 'session-changed') return
    csrf = undefined
    refreshOutcomeUnknown = false
    retryAt = 0
    onChange()
  }
  return () => channel.close()
}

function interactive<T>(operation: () => Promise<T>) {
  return navigator.locks ? navigator.locks.request(lockName, operation) : operation()
}

export function restoreSession(): Promise<Identity | null> {
  if (!restoring) {
    restoring = (async () => {
      const user = await currentUser()
      if (user || !navigator.locks || refreshOutcomeUnknown) return user
      return await navigator.locks.request(lockName, async () => {
        const updated = await currentUser()
        if (updated || refreshOutcomeUnknown) return updated
        if (Date.now() < retryAt) throw new ApiError(429)
        try {
          const token = await getCsrf()
          try {
            await send(`${authRoot}/refresh`, { method: 'POST', headers: { 'X-CSRF-Token': token } })
          } catch (error) {
            if (!(error instanceof ApiError)) refreshOutcomeUnknown = true
            throw error
          }
          return await currentUser()
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) return null
          if (error instanceof ApiError && error.retryAfter) {
            retryAt = Date.now() + error.retryAfter * 1000
          }
          throw error
        }
      })
    })().finally(() => { restoring = undefined })
  }
  return restoring
}

export function signIn(username: string, password: string) {
  return interactive(async () => {
    const response = await send(`${authRoot}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Desk-Request': '1' },
      body: JSON.stringify({ username, password }),
    })
    const result = await response.json() as Csrf & { user: Identity }
    csrf = result.csrf_token
    refreshOutcomeUnknown = false
    retryAt = 0
    authChanged()
    return result.user
  })
}

export function signOut() {
  return interactive(async () => {
    let token = csrf
    if (!token) {
      try {
        token = await getCsrf()
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) throw error
      }
    }
    await send(`${authRoot}/logout`, {
      method: 'POST',
      headers: token ? { 'X-CSRF-Token': token } : undefined,
    })
    csrf = undefined
    refreshOutcomeUnknown = false
    authChanged()
  })
}

export async function protectedRead<T>(path: string, actor: string, signal?: AbortSignal): Promise<T> {
  try {
    return await (await send(path, { signal })).json() as T
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401) || signal?.aborted) throw error
    if ((await restoreSession())?.id !== actor) throw error
    return await (await send(path, { signal })).json() as T
  }
}

export async function protectedWrite<T>(path: string, actor: string, form: object): Promise<T> {
  if ((await restoreSession())?.id !== actor) throw new ApiError(401)
  const token = csrf ?? await getCsrf()
  const response = await send(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify(form),
  })
  return await response.json() as T
}

export function homeForIdentity(identity: Identity) {
  return identity.roles.includes('employee') ? '/portal' : '/workspace'
}

export const roleLabels: Record<Role, string> = {
  employee: 'Employee', agent: 'Support agent', administrator: 'Administrator',
}
