import type { AvailabilityRule } from '../../../lib/types'

const DAYS = [
  { dayOfWeek: 0, label: 'Domingo' },
  { dayOfWeek: 1, label: 'Segunda-feira' },
  { dayOfWeek: 2, label: 'Terça-feira' },
  { dayOfWeek: 3, label: 'Quarta-feira' },
  { dayOfWeek: 4, label: 'Quinta-feira' },
  { dayOfWeek: 5, label: 'Sexta-feira' },
  { dayOfWeek: 6, label: 'Sábado' },
]

const DEFAULT_START = '09:00'
const DEFAULT_END = '18:00'

interface WeeklyScheduleEditorProps {
  value: AvailabilityRule[]
  onChange: (rules: AvailabilityRule[]) => void
}

export function WeeklyScheduleEditor({ value, onChange }: WeeklyScheduleEditorProps) {
  function toggleDay(dayOfWeek: number) {
    const existing = value.find((r) => r.dayOfWeek === dayOfWeek)
    if (existing) {
      onChange(value.filter((r) => r.dayOfWeek !== dayOfWeek))
    } else {
      onChange([...value, { dayOfWeek, startTime: DEFAULT_START, endTime: DEFAULT_END }])
    }
  }

  function updateTime(dayOfWeek: number, field: 'startTime' | 'endTime', time: string) {
    onChange(value.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, [field]: time } : r)))
  }

  return (
    <div className="flex flex-col gap-sm">
      {DAYS.map(({ dayOfWeek, label }) => {
        const rule = value.find((r) => r.dayOfWeek === dayOfWeek)
        return (
          <div key={dayOfWeek} className="flex items-center gap-md">
            <label className="flex w-40 items-center gap-xs font-sans text-body-sm text-body">
              <input type="checkbox" checked={rule !== undefined} onChange={() => toggleDay(dayOfWeek)} />
              {label}
            </label>
            {rule && (
              <>
                <label className="font-sans text-body-sm text-muted">
                  Início — {label}
                  <input
                    type="time"
                    value={rule.startTime}
                    onChange={(e) => updateTime(dayOfWeek, 'startTime', e.target.value)}
                    className="ml-xs rounded-md border border-hairline p-xs"
                  />
                </label>
                <label className="font-sans text-body-sm text-muted">
                  Fim — {label}
                  <input
                    type="time"
                    value={rule.endTime}
                    onChange={(e) => updateTime(dayOfWeek, 'endTime', e.target.value)}
                    className="ml-xs rounded-md border border-hairline p-xs"
                  />
                </label>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
