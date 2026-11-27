import { RiCalendarLine } from '@remixicon/react'
import { useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Calendar } from '@/shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'

type DatePickerProps = {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  label?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  label = 'Pick a date',
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selection = value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value)
    : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={<Button variant="outline" className="justify-start font-normal" />}
        aria-label={selection ? `${label}, ${selection}` : label}
      >
        <RiCalendarLine aria-hidden="true" />
        {selection ?? label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          defaultMonth={value}
          selected={value}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
