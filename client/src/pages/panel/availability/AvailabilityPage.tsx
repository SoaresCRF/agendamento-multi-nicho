import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WeeklyScheduleEditor } from './WeeklyScheduleEditor'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { useToast } from '../../../components/toast/useToast'
import { api, ApiError } from '../../../lib/api'
import { useDocumentTitle } from '../../../lib/useDocumentTitle'
import type { AvailabilityRule } from '../../../lib/types'

export function AvailabilityPage() {
  useDocumentTitle('Disponibilidade')
  const { data } = useQuery({ queryKey: ['availability'], queryFn: () => api.get<AvailabilityRule[]>('/api/availability') })
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [isRulesDirty, setIsRulesDirty] = useState(false)
  const { show } = useToast()
  const queryClient = useQueryClient()

  // Only re-seed from the server while the user hasn't started editing —
  // otherwise a background refetch (staleTime elapses + window refocus)
  // silently discards an in-progress, unsaved edit.
  useEffect(() => {
    if (data && !isRulesDirty) setRules(data)
  }, [data, isRulesDirty])

  function handleRulesChange(next: AvailabilityRule[]) {
    setRules(next)
    setIsRulesDirty(true)
  }

  const save = useMutation({
    mutationFn: (input: AvailabilityRule[]) => api.put<AvailabilityRule[]>('/api/availability', input),
    onSuccess: (saved) => {
      setRules(saved)
      setIsRulesDirty(false)
      queryClient.setQueryData(['availability'], saved)
      show('Disponibilidade salva')
    },
    onError: (err) => show(err instanceof ApiError ? err.message : 'Erro ao salvar', 'error'),
  })

  return (
    <Card className="max-w-2xl">
      <h1 className="mb-lg font-display text-display-sm">Disponibilidade geral</h1>
      <WeeklyScheduleEditor value={rules} onChange={handleRulesChange} />
      <Button className="mt-lg" onClick={() => save.mutate(rules)} disabled={save.isPending}>
        Salvar
      </Button>
    </Card>
  )
}
