import type { Persona } from '@/features/auth/preview-personas'
import { isRecord, readPreview, writePreview } from '@/shared/lib/preview-storage'
import { services, validateRequest, type Service, type ServiceRequest } from './catalog-model'

const key = 'service-desk.preview.requests.v1'
const seed: ServiceRequest[] = [{
  id: 'REQ-2001', serviceId: 'software-access', requesterId: 'maya', createdAt: '2026-11-21T09:40:00Z',
  item: 'Project scheduling tool', justification: 'I need to update the synthetic Operations team schedule.',
}]

function isRequest(value: unknown): value is ServiceRequest {
  return isRecord(value) && services.some(({ id }) => id === value.serviceId)
    && ['id', 'requesterId', 'item', 'justification'].every((field) => typeof value[field] === 'string')
    && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt))
}

export function readRequests() {
  return readPreview(key, (value): value is ServiceRequest[] => Array.isArray(value) && value.every(isRequest), seed)
}

export function submitRequest(persona: Persona, service: Service, item: string, justification: string) {
  const { values, errors } = validateRequest(item, justification)
  if (persona.role !== 'employee' || errors.item || errors.justification) return
  const requests = readRequests()
  const request: ServiceRequest = {
    ...values, id: 'REQ-' + crypto.randomUUID().slice(0, 8).toUpperCase(), serviceId: service.id,
    requesterId: persona.id, createdAt: new Date().toISOString(),
  }
  if (requests.some(({ id }) => id === request.id)) return
  if (writePreview(key, [...requests, request])) return request
}
