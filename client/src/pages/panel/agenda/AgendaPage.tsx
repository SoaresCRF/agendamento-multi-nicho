import { useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { useBookings, useCancelBooking } from './useBookings'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { Modal } from '../../../components/Modal'
import { EmptyState } from '../../../components/EmptyState'
import { useToast } from '../../../components/toast/useToast'
import { ApiError } from '../../../lib/api'
import { useMe } from '../../../lib/useMe'
import { useDocumentTitle } from '../../../lib/useDocumentTitle'

export function AgendaPage() {
  useDocumentTitle('Agenda')
  const { data: bookings } = useBookings()
  const { data: profile } = useMe()
  const cancelBooking = useCancelBooking()
  const { show } = useToast()
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)

  async function confirmCancel() {
    if (!pendingCancelId) return
    try {
      await cancelBooking.mutateAsync(pendingCancelId)
      show('Agendamento cancelado')
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Erro ao cancelar', 'error')
    } finally {
      setPendingCancelId(null)
    }
  }

  return (
    <div>
      <h1 className="mb-lg font-display text-display-sm">Agenda</h1>

      {!bookings?.length ? (
        <EmptyState title="Nenhum agendamento ainda" />
      ) : (
        <div className="flex flex-col gap-sm">
          {bookings.map((b) => (
            <Card key={b.id} className="flex items-center justify-between">
              <div>
                <p className="font-sans text-title-sm text-ink">{b.clientName}</p>
                <p className="font-sans text-body-sm text-muted">
                  {b.serviceType.name} —{' '}
                  {formatInTimeZone(new Date(b.startsAt), profile?.timezone ?? 'UTC', 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <div className="flex items-center gap-sm">
                <Badge tone={b.status === 'CONFIRMED' ? 'confirmed' : 'cancelled'}>
                  {b.status === 'CONFIRMED' ? 'Confirmado' : 'Cancelado'}
                </Badge>
                {b.status === 'CONFIRMED' && (
                  <Button variant="text-link" onClick={() => setPendingCancelId(b.id)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={pendingCancelId !== null} onClose={() => setPendingCancelId(null)} title="Cancelar agendamento">
        <p className="mb-md font-sans text-body-md text-body">Tem certeza que deseja cancelar este agendamento?</p>
        <div className="flex justify-end gap-sm">
          <Button variant="secondary" onClick={() => setPendingCancelId(null)}>
            Voltar
          </Button>
          <Button onClick={confirmCancel} disabled={cancelBooking.isPending}>
            Confirmar cancelamento
          </Button>
        </div>
      </Modal>
    </div>
  )
}
