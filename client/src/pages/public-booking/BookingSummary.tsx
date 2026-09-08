import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { Card } from '../../components/Card'

interface BookingSummaryProps {
  serviceName: string
  durationMinutes: number
  startsAt: string
  timezone: string
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Once the client moves past the slot-picking step, the service/date/time they chose
// otherwise never appears again — this recap follows them from the form through
// confirmation so they can verify what they're actually booking without backing out.
export function BookingSummary({ serviceName, durationMinutes, startsAt, timezone }: BookingSummaryProps) {
  const date = capitalize(formatInTimeZone(new Date(startsAt), timezone, "d 'de' MMMM 'de' yyyy", { locale: ptBR }))
  const time = formatInTimeZone(new Date(startsAt), timezone, 'HH:mm')

  return (
    <Card className="mb-lg flex items-center justify-between gap-md text-left">
      <div className="min-w-0">
        <p className="truncate font-sans text-title-sm text-ink">{serviceName}</p>
        <p className="font-sans text-body-sm text-muted">{durationMinutes} min</p>
      </div>
      <p className="shrink-0 font-sans text-body-md text-ink text-right">
        {date}
        <br />
        {time}
      </p>
    </Card>
  )
}
