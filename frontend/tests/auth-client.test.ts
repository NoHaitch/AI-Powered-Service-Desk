import { expect, mock, test } from 'bun:test'

import { ApiError, errorMessage, homeForIdentity, protectedWrite, type Identity } from '../src/features/auth/client'

const employee: Identity = { id: 'test-user', display_name: 'Synthetic Employee', roles: ['employee'] }

test('routes by server roles and provides a safe message for an unknown failure', () => {
  expect(homeForIdentity(employee)).toBe('/portal')
  expect(homeForIdentity({ ...employee, roles: ['administrator'] })).toBe('/workspace')
  expect(errorMessage(new ApiError(401), true)).toBe('The username or password is incorrect.')
  expect(errorMessage(new Error('sensitive-details'))).not.toContain('sensitive-details')
})

test('an ambiguous incident submission is sent only once', async () => {
  const original = globalThis.fetch
  const calls: string[] = []
  const stub = mock(async (input: RequestInfo | URL) => {
    const path = String(input)
    calls.push(path)
    if (path.endsWith('/me')) return Response.json(employee)
    if (path.endsWith('/csrf')) return Response.json({ csrf_token: 'synthetic-csrf' })
    throw new TypeError('The connection ended after submission.')
  })
  globalThis.fetch = stub as unknown as typeof fetch
  try {
    await expect(protectedWrite('/api/v1/incidents', employee.id, {
      summary: 'Test incident', description: 'A synthetic report',
    })).rejects.toThrow()
    expect(calls).toEqual(['/api/v1/auth/me', '/api/v1/auth/csrf', '/api/v1/incidents'])
  } finally {
    globalThis.fetch = original
  }
})
