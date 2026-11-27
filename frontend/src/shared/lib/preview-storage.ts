export function readPreview<T>(key: string, isValue: (value: unknown) => value is T, fallback: T): T {
  try {
    const stored = sessionStorage.getItem(key)
    if (stored !== null) {
      const value: unknown = JSON.parse(stored)
      if (isValue(value)) return value
    }
  } catch {
    return fallback
  }
  return fallback
}

export function writePreview(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
