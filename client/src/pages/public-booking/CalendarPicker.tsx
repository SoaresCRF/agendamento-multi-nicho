import { useState } from 'react'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { cx } from '../../lib/cx'

interface CalendarPickerProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  timezone: string
  now?: Date
}

export function CalendarPicker({ selectedDate, onSelectDate, timezone, now = new Date() }: CalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(() => selectedDate.slice(0, 7)) // "YYYY-MM"
  const todayStr = formatInTimeZone(now, timezone, 'yyyy-MM-dd')

  const [year, month] = viewMonth.split('-').map(Number)
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const startWeekday = toZonedTime(firstOfMonth, timezone).getUTCDay()

  const cells: Array<{ dateStr: string; day: number } | null> = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${viewMonth}-${String(day).padStart(2, '0')}`
    cells.push({ dateStr, day })
  }

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1))
    setViewMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div>
      <div className="mb-sm flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior" className="text-muted hover:text-ink">
          ‹
        </button>
        <span className="font-sans text-title-sm text-ink">{viewMonth}</span>
        <button onClick={() => shiftMonth(1)} aria-label="Próximo mês" className="text-muted hover:text-ink">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-xxs">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />
          const isPast = cell.dateStr < todayStr
          const isSelected = cell.dateStr === selectedDate
          return (
            <button
              key={cell.dateStr}
              disabled={isPast}
              onClick={() => onSelectDate(cell.dateStr)}
              aria-label={String(cell.day)}
              className={cx(
                'h-11 w-11 rounded-full font-sans text-body-sm',
                isSelected && 'bg-primary text-on-primary',
                !isSelected && !isPast && 'text-ink hover:bg-surface-soft',
                isPast && 'cursor-not-allowed text-muted-soft'
              )}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
