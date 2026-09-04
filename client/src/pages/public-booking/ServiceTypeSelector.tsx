import { cx } from '../../lib/cx'
import { Badge } from '../../components/Badge'
import type { PublicServiceType } from '../../lib/types'

interface ServiceTypeSelectorProps {
  serviceTypes: PublicServiceType[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ServiceTypeSelector({ serviceTypes, selectedId, onSelect }: ServiceTypeSelectorProps) {
  return (
    <div className="flex flex-col gap-sm">
      {serviceTypes.map((st) => (
        <button
          key={st.id}
          onClick={() => onSelect(st.id)}
          className={cx(
            'flex items-start justify-between rounded-lg border p-lg text-left transition-colors',
            selectedId === st.id ? 'border-primary bg-primary-soft' : 'border-hairline bg-surface hover:bg-surface-soft'
          )}
        >
          <div>
            <p className="font-sans text-title-lg text-ink">{st.name}</p>
            {st.description && <p className="mt-xs font-sans text-body-sm text-muted">{st.description}</p>}
            {st.requiresCustomForm && (
              <p className="mt-xs font-sans text-caption text-muted">
                <span aria-hidden="true">📋</span> requer formulário
              </p>
            )}
          </div>
          <Badge>{st.durationMinutes} min</Badge>
        </button>
      ))}
    </div>
  )
}
