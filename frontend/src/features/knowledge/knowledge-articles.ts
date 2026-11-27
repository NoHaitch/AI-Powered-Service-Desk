import { readArticle } from './knowledge-markdown'

const sources = import.meta.glob<string>('./articles/*.md', { eager: true, query: '?raw', import: 'default' })

export const articles = Object.entries(sources)
  .map(([path, source]) => readArticle(path.slice('./articles/'.length, -'.md'.length), source))
  .sort((a, b) => a.title.localeCompare(b.title))
