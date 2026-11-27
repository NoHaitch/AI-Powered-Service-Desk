import { RiSearchLine } from '@remixicon/react'

import { Input } from '@/shared/components/ui/input'

export function BrowseFilters({ query, category, categories, onQuery, onCategory }: {
  query: string
  category: string
  categories: readonly string[]
  onQuery: (value: string) => void
  onCategory: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="filter-label w-full sm:max-w-80">Search
        <span className="relative">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" className="pl-9" value={query} onChange={(event) => onQuery(event.target.value)} />
        </span>
      </label>
      <label className="filter-label">Category
        <select className="desk-select" value={category} onChange={(event) => onCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
    </div>
  )
}
