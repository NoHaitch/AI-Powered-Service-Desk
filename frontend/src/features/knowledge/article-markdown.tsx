import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import type { MarkdownBlock } from './knowledge-markdown'

const headingTags = ['h2', 'h3', 'h4', 'h5', 'h6'] as const

export function ArticleMarkdown({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <article className="space-y-4 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading': {
            const Heading = headingTags[block.level - 2]
            return (
              <Heading key={block.id} id={block.id} tabIndex={-1}
                className={`scroll-mt-28 sm:scroll-mt-16 font-semibold ${block.level === 2 ? 'text-lg' : 'text-base'}`}>
                {block.text}
              </Heading>
            )
          }
          case 'paragraph':
            return <p key={index}>{block.text}</p>
          case 'table':
            return (
              <Table key={index} className="min-w-72 border border-border">
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    {block.headers.map((header, column) => (
                      <TableHead key={column} scope="col" className="whitespace-normal" style={{ textAlign: block.alignments[column] }}>
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {block.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, column) => (
                        <TableCell key={column} className="align-top whitespace-normal" style={{ textAlign: block.alignments[column] }}>
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          case 'ordered-list':
          case 'unordered-list': {
            const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)
            return block.type === 'ordered-list'
              ? <ol key={index} start={block.start} className="list-decimal space-y-1 pl-6">{items}</ol>
              : <ul key={index} className="list-disc space-y-1 pl-6">{items}</ul>
          }
        }
      })}
    </article>
  )
}
