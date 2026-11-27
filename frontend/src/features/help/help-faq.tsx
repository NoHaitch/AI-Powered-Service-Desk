import { useState } from 'react'

import { PageHeading } from '@/app/ui'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import faq from './faq.json'

export function HelpFaq() {
  const [query, setQuery] = useState('')
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const categories = faq.categories.map((category) => ({
    ...category,
    entries: category.entries.filter(({ question, answer }) => {
      const text = `${category.label} ${question} ${answer}`.toLowerCase()
      return terms.every((term) => text.includes(term))
    }),
  })).filter(({ entries }) => entries.length > 0)
  const resultCount = categories.reduce((count, { entries }) => count + entries.length, 0)

  return (
    <>
      <PageHeading title="Help & FAQ" description="Learn how to use the preview and browse sample answers to common workplace IT questions." />
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="faq-search">Search the FAQ</Label>
            <div className="flex items-center gap-2">
              <Input
                id="faq-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && <Button variant="outline" onClick={() => {
                setQuery('')
                document.getElementById('faq-search')?.focus()
              }}>Clear</Button>}
            </div>
            <p role="status" className="text-sm text-muted-foreground">
              {terms.length > 0 && (resultCount === 0
                ? 'No questions found. Try a different search.'
                : `${resultCount} ${resultCount === 1 ? 'question' : 'questions'} found.`)}
            </p>
          </div>
          {categories.length > 0 && (
            <nav aria-labelledby="faq-contents">
              <h2 id="faq-contents" className="mb-2 font-semibold">On this page</h2>
              <ul className="flex flex-wrap gap-2">
                {categories.map(({ id, label }) => (
                  <li key={id}>
                    <a className="inline-block rounded-xl bg-muted px-3 py-1.5 text-sm hover:bg-accent hover:underline" href={`#${id}`}>{label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </CardContent>
      </Card>
      {categories.map(({ id, label, scope, entries }) => (
        <section key={id} aria-labelledby={id}>
          <Card>
            <CardContent className="space-y-2">
              <h2 id={id} tabIndex={-1} className="scroll-mt-6 text-lg font-semibold">{label}</h2>
              {scope === 'sample' && <p className="text-sm text-muted-foreground">Sample workplace guidance</p>}
              <Accordion>
                {entries.map(({ id: entryId, question, answer }) => (
                  <AccordionItem key={entryId} value={entryId}>
                    <AccordionTrigger>{question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>
      ))}
    </>
  )
}
