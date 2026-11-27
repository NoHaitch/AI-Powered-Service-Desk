import { services, type Service } from '@/features/catalog/catalog-model'

export type Article = {
  id: string
  title: string
  category: string
  summary: string
  updated: string
  body: string
  service?: Service['id']
}

export function readArticle(id: string, source: string): Article {
  const header = /^---\r?\n([\s\S]+?)\r?\n---\r?\n/.exec(source)
  if (!header) throw new Error(`Missing article metadata for ${id}.`)

  const metadata = new Map(header[1].split(/\r?\n/).map((line) => {
    const field = /^(title|category|summary|service|updated):\s*(\S.*)$/.exec(line)
    if (!field) throw new Error(`Invalid article metadata for ${id}.`)
    return [field[1], field[2].trim()]
  }))
  const title = metadata.get('title')
  const category = metadata.get('category')
  const summary = metadata.get('summary')
  const updated = metadata.get('updated') ?? ''
  const date = new Date(`${updated}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== updated) {
    throw new Error(`Invalid article update date for ${id}.`)
  }
  const body = source.slice(header[0].length).trim()
  if (!title || !category || !summary || !body) throw new Error(`Incomplete article for ${id}.`)

  const serviceId = metadata.get('service')
  const service = services.find(({ id }) => id === serviceId)?.id
  if (serviceId && !service) throw new Error(`Unknown catalog service for ${id}.`)
  return { id, title, category, summary, updated, body, service }
}

export type MarkdownBlock =
  | { type: 'heading'; text: string; level: number; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ordered-list'; items: string[]; start: number }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][]; alignments: TableAlignment[] }

type TableAlignment = 'left' | 'center' | 'right'

function tableCells(line: string) {
  return line.trim().replace(/^\||(?<!\\)\|$/g, '').split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll('\\|', '|'))
}

function readTable(lines: string[]): MarkdownBlock | undefined {
  if (lines.length < 2 || lines.some((line) => !line.includes('|'))) return
  const headers = tableCells(lines[0])
  const separators = tableCells(lines[1])
  if (headers.length !== separators.length || !separators.every((cell) => /^:?-{3,}:?$/.test(cell))) return

  const alignments = separators.map((cell): TableAlignment => {
    if (!cell.endsWith(':')) return 'left'
    return cell.startsWith(':') ? 'center' : 'right'
  })
  const rows = lines.slice(2).map((line) => {
    const cells = tableCells(line)
    return headers.map((_, index) => cells[index] ?? '')
  })
  return { type: 'table', headers, rows, alignments }
}

export function readMarkdown(body: string): MarkdownBlock[] {
  const ordered = /^\d+\.\s+/
  const unordered = /^-\s+/
  const usedIds = new Set<string>()

  return body.trim().split(/(?:\r?\n[ \t]*){2,}/).map((block): MarkdownBlock => {
    const lines = block.trim().split(/\r?\n/)
    const heading = lines.length === 1 && /^(#{2,6})\s+(.+)$/.exec(lines[0])
    if (heading) {
      const text = heading[2].replace(/[ \t]+#+$/, '').trim()
      const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const base = `section-${slug || 'heading'}`
      let id = base
      for (let suffix = 2; usedIds.has(id); suffix++) id = `${base}-${suffix}`
      usedIds.add(id)
      return { type: 'heading', text, level: heading[1].length, id }
    }
    const table = readTable(lines)
    if (table) return table
    if (lines.every((line) => ordered.test(line))) {
      return { type: 'ordered-list', start: Number.parseInt(lines[0], 10), items: lines.map((line) => line.replace(ordered, '')) }
    }
    if (lines.every((line) => unordered.test(line))) {
      return { type: 'unordered-list', items: lines.map((line) => line.replace(unordered, '')) }
    }
    return { type: 'paragraph', text: lines.join(' ') }
  })
}
