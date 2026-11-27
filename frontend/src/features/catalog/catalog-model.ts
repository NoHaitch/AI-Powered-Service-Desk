type Field = {
  id: string
  label: string
  required?: boolean
  requiredWhen?: { field: string; value: string }
} & (
  | { type: 'select'; options: readonly string[] }
  | { type: 'text' | 'date' }
)

type CatalogService = {
  id: string
  category: string
  title: string
  description: string
  details: string
  criteria: string
  processingEstimate: string
  preparation: readonly string[]
  field: string
  hint: string
  fields: readonly Field[]
}

const neededBy = { id: 'neededBy', label: 'Needed by', type: 'date' } as const

export const services = [
  {
    id: 'software-access',
    processingEstimate: '2–3 business days',
    category: 'Software',
    title: 'Request software access',
    description: 'Ask for access to an existing work application.',
    details: 'Get access to a work application or change your existing role. The request gives the application owner enough context to review permissions and any license they may need to allocate.',
    criteria: 'Use this for an application your organization already offers. Report an incident if access that previously worked has stopped.',
    preparation: ['Confirm the official application name and which team owns it.', 'Identify the lowest level of access that allows you to do the work. Mention any license constraints in the justification.'],
    field: 'Application name',
    hint: 'Name the task you need to perform in the application.',
    fields: [
      { id: 'change', label: 'Access change', type: 'select', options: ['New access', 'Change existing access'] },
      { id: 'role', label: 'Requested application role', type: 'text' },
      neededBy,
    ],
  },
  {
    id: 'shared-drive',
    processingEstimate: '1–2 business days',
    category: 'Accounts & access',
    title: 'Request shared drive access',
    description: 'Ask for access to a team folder or shared drive.',
    details: 'Ask for access to the specific folder or drive your team uses. The folder owner can use the path and permission level to review the scope.',
    criteria: 'Request only the folder and permission level you need. A sudden loss of existing access belongs in incident reporting.',
    preparation: ['Use the complete team folder name or path so support can distinguish it from similarly named folders.', 'Confirm who owns the folder if you know them.'],
    field: 'Team folder or drive name',
    hint: 'Describe the project or work that requires access.',
    fields: [
      { id: 'permission', label: 'Permission level', type: 'select', options: ['View', 'Edit'], required: true },
      { id: 'owner', label: 'Folder owner or team', type: 'text' },
      neededBy,
    ],
  },
  {
    id: 'equipment',
    processingEstimate: '3–5 business days',
    category: 'Hardware',
    title: 'Request IT equipment',
    description: 'Request a keyboard, monitor, headset, or similar equipment.',
    details: 'Ask for equipment for a first setup, a change in workstation needs, or a replacement. Provide enough information to check compatibility and arrange delivery or collection.',
    criteria: 'Use this for equipment needed for work. If broken equipment is actively disrupting your work, also report the disruption as an incident.',
    preparation: ['Check which model or connection type the equipment should support.', 'Include an existing asset tag in the justification for replacement requests if one is available.'],
    field: 'Equipment needed',
    hint: 'Describe your setup and why the equipment is needed.',
    fields: [
      { id: 'reason', label: 'Request type', type: 'select', options: ['New setup', 'Replacement', 'Additional equipment'], required: true },
      { id: 'location', label: 'Delivery or pickup location', type: 'text', required: true },
      neededBy,
    ],
  },
  {
    id: 'mailing-list',
    processingEstimate: '1–2 business days',
    category: 'Accounts & access',
    title: 'Request mailing list access',
    description: 'Request to join an internal distribution list.',
    details: 'Join a distribution list to receive team updates, or request removal when the messages are no longer relevant to your work.',
    criteria: 'Use this for membership in an existing list. Message delivery problems on a list you already belong to are incidents.',
    preparation: ['Find the exact list name so the list owner can identify it.', 'Explain which team or project needs the messages.'],
    field: 'Distribution list name',
    hint: 'Explain why the membership should change.',
    fields: [{ id: 'membership', label: 'Membership change', type: 'select', options: ['Join list', 'Leave list'], required: true }],
  },
  {
    id: 'work-email',
    processingEstimate: '2–3 business days',
    category: 'Email & collaboration',
    title: 'Request a work email account',
    description: 'Request an individual work mailbox or a change to its email alias.',
    details: 'Use this service for a new individual work mailbox or an alias change on an existing mailbox. A mailbox belongs to one person and is distinct from a team inbox.',
    criteria: 'Have the requester’s team and manager or internal sponsor confirm the need. Use the shared mailbox request for a team address.',
    preparation: ['Have a synthetic display name or current account reference ready.', 'For an alias change, describe the desired alias using sample data.'],
    field: 'Display name or mailbox reference',
    hint: 'Explain who the account is for and why it is needed.',
    fields: [
      { id: 'change', label: 'Mailbox change', type: 'select', options: ['New mailbox', 'Change email alias'], required: true },
      { id: 'team', label: 'Department or team', type: 'text', required: true },
      neededBy,
    ],
  },
  {
    id: 'vpn-access',
    processingEstimate: '2–4 business days',
    category: 'Connectivity',
    title: 'Request VPN access',
    description: 'Request remote access to internal work resources.',
    details: 'Request VPN access to reach specified internal resources from outside the office. Listing the systems you need gives support the scope of the request.',
    criteria: 'Use an approved device and request access only to resources needed for work. If an existing VPN connection stops working, report an incident.',
    preparation: ['Identify the internal applications or services you need.', 'Check if your device is company-managed or approved for work use.'],
    field: 'Internal resource or application',
    hint: 'Explain where you will connect from and why remote access is needed.',
    fields: [
      { id: 'device', label: 'Device type', type: 'select', options: ['Company-managed laptop', 'Approved personal device'], required: true },
      { id: 'duration', label: 'Access duration', type: 'select', options: ['Ongoing', 'Temporary'], required: true },
      { id: 'endDate', label: 'Access end date', type: 'date', requiredWhen: { field: 'duration', value: 'Temporary' } },
    ],
  },
  {
    id: 'shared-mailbox',
    processingEstimate: '1–3 business days',
    category: 'Email & collaboration',
    title: 'Request shared mailbox access',
    description: 'Ask to read or send messages from an existing team inbox.',
    details: 'Request access to a mailbox managed by several team members. Reading and replying from the team address are separate permissions.',
    criteria: 'Confirm that the mailbox owner expects you to help manage the inbox. Request the minimum permission needed for your tasks.',
    preparation: ['Confirm the shared mailbox name and give the owning team if known.', 'Decide whether you only need to read messages or also need to send replies from the team address.'],
    field: 'Shared mailbox name',
    hint: 'Describe responsibilities you will have for this inbox.',
    fields: [
      { id: 'permission', label: 'Mailbox permission', type: 'select', options: ['Read only', 'Read and send replies'], required: true },
      { id: 'owner', label: 'Mailbox owner or team', type: 'text' },
    ],
  },
  {
    id: 'mobile-enrollment',
    processingEstimate: '2–4 business days',
    category: 'Hardware',
    title: 'Request work phone enrollment',
    description: 'Set up or replace a phone used for approved work apps.',
    details: 'Ask support to enroll a phone so it can use approved work apps. If you are replacing a device, support needs to distinguish the current phone from the replacement.',
    criteria: 'Use a company-issued device or a personal device approved for work. If a device is lost or stolen, report it through your organization’s official security channel.',
    preparation: ['Check the phone model and operating system.', 'If replacing a phone, note whether the existing device is still available.'],
    field: 'Phone model and operating system',
    hint: 'List the work apps you need and explain the reason for enrollment.',
    fields: [
      { id: 'ownership', label: 'Device ownership', type: 'select', options: ['Company-issued', 'Approved personal device'], required: true },
      { id: 'setup', label: 'Setup type', type: 'select', options: ['First enrollment', 'Replacement device'], required: true },
    ],
  },
  {
    id: 'employee-onboarding',
    processingEstimate: '5–7 business days',
    category: 'Accounts & access',
    title: 'Request IT setup for a new starter',
    description: 'Coordinate accounts, equipment, and access for a first day.',
    details: 'Give IT an overview of a new starter’s setup so the team can plan equipment, work email, and essential applications together.',
    criteria: 'The requester should know the team’s start date and work arrangement. Use individual service requests for one-off changes after onboarding.',
    preparation: ['Confirm the start date and where the new starter will work.', 'List the equipment, applications, and shared resources needed for their first week.'],
    field: 'New starter name or reference',
    hint: 'Use a synthetic name or reference and summarize the setup needed.',
    fields: [
      { id: 'startDate', label: 'Start date', type: 'date', required: true },
      { id: 'team', label: 'Department or team', type: 'text', required: true },
      { id: 'arrangement', label: 'Work arrangement', type: 'select', options: ['Office', 'Remote', 'Hybrid'], required: true },
    ],
  },
] as const satisfies readonly CatalogService[]

export type Service = CatalogService & { id: typeof services[number]['id'] }

export type ServiceRequest = {
  id: string
  serviceId: Service['id']
  requesterId: string
  createdAt: string
  item: string
  justification: string
  details?: Record<string, string>
}

export function validateRequest(item: string, justification: string) {
  const values = { item: item.trim(), justification: justification.trim() }
  const errors = {
    item: values.item.length > 0 && Array.from(values.item).length <= 120 ? '' : 'Enter 1 to 120 characters.',
    justification: values.justification.length > 0 && Array.from(values.justification).length <= 2000 ? '' : 'Enter 1 to 2,000 characters.',
  }
  return { values, errors }
}

export function isFieldRequired(field: Field, input: Record<string, unknown>) {
  return field.required || (field.requiredWhen && input[field.requiredWhen.field] === field.requiredWhen.value)
}

export function validateServiceFields(service: Service, input: Record<string, unknown>) {
  const values: Record<string, string> = {}
  const errors: Record<string, string> = {}

  for (const field of service.fields) {
    const raw = input[field.id]
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (!value) {
      if (isFieldRequired(field, input)) errors[field.id] = 'This field is required.'
      continue
    }
    if (field.type === 'select' && !field.options.includes(value)) {
      errors[field.id] = 'Choose one of the listed options.'
      continue
    }
    if (field.type === 'date') {
      const date = new Date(`${value}T00:00:00Z`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        errors[field.id] = 'Enter a valid date.'
        continue
      }
    }
    if (Array.from(value).length > 120) {
      errors[field.id] = 'Enter no more than 120 characters.'
      continue
    }
    values[field.id] = value
  }

  return { values, errors }
}
