import { formatInTimeZone } from 'date-fns-tz'
import { cx } from '../../lib/cx'

interface SlotGridProps {
  slots: string[]
  selectedSlot: string | null
  onSelectSlot: (iso: string) => void
  timezone: string
}

export function SlotGrid({ slots, selectedSlot, onSelectSlot, timezone }: SlotGridProps) {
  return (
    <div className="flex flex-wrap gap-xs">
      {slots.map((iso) => {
        const label = formatInTimeZone(new Date(iso), timezone, 'HH:mm')
        const isSelected = iso === selectedSlot
        return (
          <button
            key={iso}
            onClick={() => onSelectSlot(iso)}
            className={cx(
              'h-11 min-w-[72px] rounded-md border font-sans text-body-sm',
              isSelected
                ? 'border-primary bg-primary text-on-primary'
                : 'border-hairline bg-surface text-ink hover:bg-surface-soft',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
