export const services = [
  { id: 'software-access', category: 'Software', title: 'Request software access', description: 'Ask for access to an existing work application.', field: 'Application name', hint: 'Explain how you will use the application.' },
  { id: 'shared-drive', category: 'Accounts & access', title: 'Request shared drive access', description: 'Ask for access to a team folder or shared drive.', field: 'Team folder or drive name', hint: 'Describe your work need and the access level you are requesting.' },
  { id: 'equipment', category: 'Hardware', title: 'Request IT equipment', description: 'Request a keyboard, monitor, headset, or similar equipment.', field: 'Equipment needed', hint: 'Describe your setup and why the equipment is needed.' },
  { id: 'mailing-list', category: 'Accounts & access', title: 'Request mailing list access', description: 'Request to join an internal distribution list.', field: 'Distribution list name', hint: 'Explain why you need to receive messages from this list.' },
] as const

export type Service = typeof services[number]
export type ServiceRequest = {
  id: string
  serviceId: Service['id']
  requesterId: string
  createdAt: string
  item: string
  justification: string
}

export function validateRequest(item: string, justification: string) {
  const values = { item: item.trim(), justification: justification.trim() }
  const errors = {
    item: values.item.length > 0 && Array.from(values.item).length <= 120 ? '' : 'Enter 1 to 120 characters.',
    justification: values.justification.length > 0 && Array.from(values.justification).length <= 2000 ? '' : 'Enter 1 to 2,000 characters.',
  }
  return { values, errors }
}
