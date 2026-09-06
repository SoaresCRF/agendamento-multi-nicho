import { formatInTimeZone } from 'date-fns-tz'
import { cx } from '../../lib/cx'

interface SlotGridProps {
  slots: string[]
  selectedSlot: string | null
  onSelectSlot: (iso: string) => void
  timezone: string
}

const PERIODS = [
  { label: 'Manhã', matches: (hour: number) => hour < 12 },
  { label: 'Tarde', matches: (hour: number) => hour >= 12 && hour < 18 },
  { label: 'Noite', matches: (hour: number) => hour >= 18 },
]

export function SlotGrid({ slots, selectedSlot, onSelectSlot, timezone }: SlotGridProps) {
  const groups = PERIODS.map((period) => ({
    label: period.label,
    slots: slots.filter((iso) => period.matches(Number(formatInTimeZone(new Date(iso), timezone, 'H')))),
  })).filter((group) => group.slots.length > 0)

  return (
    <div className="flex flex-col gap-md">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-xs font-sans text-title-sm text-ink">{group.label}</h3>
          <div className="flex flex-wrap gap-xs">
            {group.slots.map((iso) => {
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
        </div>
      ))}
    </div>
  )
}
