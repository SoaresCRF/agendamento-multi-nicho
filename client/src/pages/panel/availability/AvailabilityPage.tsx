import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WeeklyScheduleEditor } from './WeeklyScheduleEditor'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { useToast } from '../../../components/toast/useToast'
import { api, ApiError } from '../../../lib/api'
import type { AvailabilityRule } from '../../../lib/types'

export function AvailabilityPage() {
  const { data } = useQuery({ queryKey: ['availability'], queryFn: () => api.get<AvailabilityRule[]>('/api/availability') })
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const { show } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (data) setRules(data)
  }, [data])

  const save = useMutation({
    mutationFn: (input: AvailabilityRule[]) => api.put<AvailabilityRule[]>('/api/availability', input),
    onSuccess: (saved) => {
      setRules(saved)
      queryClient.setQueryData(['availability'], saved)
      show('Disponibilidade salva')
    },
    onError: (err) => show(err instanceof ApiError ? err.message : 'Erro ao salvar', 'error'),
  })

  return (
    <Card className="max-w-2xl">
      <h1 className="mb-lg font-display text-display-sm">Disponibilidade geral</h1>
      <WeeklyScheduleEditor value={rules} onChange={setRules} />
      <Button className="mt-lg" onClick={() => save.mutate(rules)}>
        Salvar
      </Button>
    </Card>
  )
}
