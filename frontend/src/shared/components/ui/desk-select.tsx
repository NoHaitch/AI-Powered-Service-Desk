import { RiArrowDownSLine } from '@remixicon/react'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

export function DeskSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block">
      <select className={cn('desk-select w-full appearance-none pr-9 forced-colors:appearance-auto', className)} {...props} />
      <RiArrowDownSLine className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground forced-colors:hidden"
        aria-hidden="true" />
    </span>
  )
}
