import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useBlockedSlots, useCreateBlockedSlot, useDeleteBlockedSlot } from './useBlockedSlots'
import { Card } from '../../../components/Card'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { EmptyState } from '../../../components/EmptyState'
import { useToast } from '../../../components/toast/useToast'
import { api, ApiError } from '../../../lib/api'
import type { MeResponse } from '../../../lib/types'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

const blockedSlotSchema = z
  .object({
    startsAt: z.string().min(1, 'Início é obrigatório'),
    endsAt: z.string().min(1, 'Fim é obrigatório'),
    reason: z.string().optional(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: 'Fim deve ser depois do início',
    path: ['endsAt'],
  })

type BlockedSlotFormValues = z.infer<typeof blockedSlotSchema>

export function BlockedSlotsPage() {
  const { data: blockedSlots } = useBlockedSlots()
  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<MeResponse>('/api/me'),
  })
  const createBlockedSlot = useCreateBlockedSlot()
  const deleteBlockedSlot = useDeleteBlockedSlot()
  const { show } = useToast()
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<BlockedSlotFormValues>({ resolver: zodResolver(blockedSlotSchema) })

  async function onSubmit(values: BlockedSlotFormValues) {
    try {
      await createBlockedSlot.mutateAsync({
        startsAt: fromZonedTime(values.startsAt, profile!.timezone).toISOString(),
        endsAt: fromZonedTime(values.endsAt, profile!.timezone).toISOString(),
        reason: values.reason || undefined,
      })
      show('Bloqueio adicionado')
      reset()
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Erro ao adicionar bloqueio', 'error')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBlockedSlot.mutateAsync(id)
      show('Bloqueio removido')
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Erro ao remover', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-display-sm">Bloqueios</h1>

      <Card className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-md">
          <Input label="Início" id="startsAt" type="datetime-local" error={errors.startsAt?.message} {...register('startsAt')} />
          <Input label="Fim" id="endsAt" type="datetime-local" error={errors.endsAt?.message} {...register('endsAt')} />
          <Input label="Motivo (opcional)" id="reason" {...register('reason')} />
          <Button type="submit" disabled={!profile}>Adicionar bloqueio</Button>
        </form>
      </Card>

      {!blockedSlots?.length ? (
        <EmptyState title="Nenhum bloqueio cadastrado" />
      ) : (
        <div className="flex flex-col gap-sm">
          {blockedSlots.map((b) => (
            <Card key={b.id} className="flex items-center justify-between">
              <div>
                <p className="font-sans text-body-md text-ink">
                  {formatInTimeZone(new Date(b.startsAt), profile?.timezone ?? 'UTC', "dd/MM/yyyy HH:mm")} —{' '}
                  {formatInTimeZone(new Date(b.endsAt), profile?.timezone ?? 'UTC', "dd/MM/yyyy HH:mm")}
                </p>
                {b.reason && <p className="font-sans text-body-sm text-muted">{b.reason}</p>}
              </div>
              <Button variant="text-link" onClick={() => handleDelete(b.id)}>
                Remover
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
