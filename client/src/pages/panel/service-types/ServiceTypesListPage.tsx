import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useServiceTypes, useDeleteServiceType } from './useServiceTypes'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { Modal } from '../../../components/Modal'
import { EmptyState } from '../../../components/EmptyState'
import { useToast } from '../../../components/toast/useToast'
import { ApiError } from '../../../lib/api'

export function ServiceTypesListPage() {
  const { data: serviceTypes, isLoading } = useServiceTypes()
  const deleteServiceType = useDeleteServiceType()
  const { show } = useToast()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  async function confirmDelete() {
    if (!pendingDeleteId) return
    try {
      await deleteServiceType.mutateAsync(pendingDeleteId)
      show('Tipo de serviço removido')
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Erro ao remover', 'error')
    } finally {
      setPendingDeleteId(null)
    }
  }

  if (isLoading) return <p className="font-sans text-body-md text-muted">Carregando…</p>

  return (
    <div>
      <div className="mb-lg flex items-center justify-between">
        <h1 className="font-display text-display-sm">Tipos de Serviço</h1>
        <Link to="/painel/tipos-de-servico/novo">
          <Button>Adicionar tipo de serviço</Button>
        </Link>
      </div>

      {!serviceTypes?.length ? (
        <EmptyState
          title="Nenhum tipo de serviço cadastrado"
          description="Crie o primeiro tipo de serviço para começar a receber agendamentos."
          action={
            <Link to="/painel/tipos-de-servico/novo">
              <Button>Adicionar tipo de serviço</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          {serviceTypes.map((st) => (
            <Card key={st.id}>
              <div className="flex items-start justify-between">
                <h2 className="font-sans text-title-lg text-ink">{st.name}</h2>
                <Badge>{st.durationMinutes} min</Badge>
              </div>
              {st.description && <p className="mt-xs font-sans text-body-sm text-muted">{st.description}</p>}
              <div className="mt-md flex gap-sm">
                <Link to={`/painel/tipos-de-servico/${st.id}`}>
                  <Button variant="text-link">Editar</Button>
                </Link>
                <Button variant="text-link" onClick={() => setPendingDeleteId(st.id)}>
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)} title="Excluir tipo de serviço">
        <p className="mb-md font-sans text-body-md text-body">
          Tem certeza? Essa ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-sm">
          <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>
            Cancelar
          </Button>
          <Button onClick={confirmDelete} disabled={deleteServiceType.isPending}>Confirmar exclusão</Button>
        </div>
      </Modal>
    </div>
  )
}
