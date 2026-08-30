import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { useCreateServiceType, useUpdateServiceType } from './useServiceTypes'
import { useToast } from '../../../components/toast/useToast'
import { api, ApiError } from '../../../lib/api'
import { WeeklyScheduleEditor } from '../availability/WeeklyScheduleEditor'
import type { ServiceType, AvailabilityRule } from '../../../lib/types'

// Mirrors server/src/modules/service-types/service-types.schemas.ts exactly.
const customFieldFormSchema = z.object({
  label: z.string().min(1, 'Rótulo é obrigatório'),
  fieldType: z.enum(['TEXT', 'NUMBER', 'SELECT', 'TEXTAREA']),
  required: z.boolean(),
  order: z.number().int().nonnegative(),
  options: z.string().optional(), // comma-separated in the UI; split before submit
})

const serviceTypeFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  durationMinutes: z.coerce.number().int().positive('Duração deve ser maior que zero'),
  description: z.string().optional(),
  requiresCustomForm: z.boolean(),
  customFields: z.array(customFieldFormSchema),
})

type ServiceTypeFormValues = z.infer<typeof serviceTypeFormSchema>

const EMPTY_FORM: ServiceTypeFormValues = {
  name: '', durationMinutes: 30, description: '', requiresCustomForm: false, customFields: [],
}

export function ServiceTypeFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = id !== undefined && id !== 'novo'
  const navigate = useNavigate()
  const { show } = useToast()
  const createServiceType = useCreateServiceType()
  const updateServiceType = useUpdateServiceType()

  const { data: existing } = useQuery({
    queryKey: ['service-types', id],
    queryFn: () => api.get<ServiceType>(`/api/service-types/${id}`),
    enabled: isEdit,
  })

  const queryClient = useQueryClient()
  const { data: existingRules } = useQuery({
    queryKey: ['service-types', id, 'availability-rules'],
    queryFn: () => api.get<AvailabilityRule[]>(`/api/service-types/${id}/availability-rules`),
    enabled: isEdit,
  })
  const [rules, setRules] = useState<AvailabilityRule[]>([])

  useEffect(() => {
    if (existingRules) setRules(existingRules)
  }, [existingRules])

  const saveRules = useMutation({
    mutationFn: (input: AvailabilityRule[]) => api.put<AvailabilityRule[]>(`/api/service-types/${id}/availability-rules`, input),
    onSuccess: (saved) => {
      setRules(saved)
      queryClient.setQueryData(['service-types', id, 'availability-rules'], saved)
      show('Regras de disponibilidade salvas')
    },
    onError: (err) => show(err instanceof ApiError ? err.message : 'Erro ao salvar', 'error'),
  })

  const { register, control, handleSubmit, reset, watch, formState: { errors } } =
    useForm<ServiceTypeFormValues>({ resolver: zodResolver(serviceTypeFormSchema), defaultValues: EMPTY_FORM })

  const { fields, append, remove } = useFieldArray({ control, name: 'customFields' })
  const requiresCustomForm = watch('requiresCustomForm')

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        durationMinutes: existing.durationMinutes,
        description: existing.description ?? '',
        requiresCustomForm: existing.requiresCustomForm,
        customFields: existing.customFields.map((f) => ({
          label: f.label, fieldType: f.fieldType, required: f.required,
          order: f.order, options: f.options?.join(', ') ?? '',
        })),
      })
    }
  }, [existing, reset])

  async function onSubmit(values: ServiceTypeFormValues) {
    const input = {
      name: values.name,
      durationMinutes: values.durationMinutes,
      description: values.description || undefined,
      requiresCustomForm: values.requiresCustomForm,
      customFields: values.customFields.map((f) => ({
        label: f.label,
        fieldType: f.fieldType,
        required: f.required,
        order: f.order,
        options: f.fieldType === 'SELECT' && f.options
          ? f.options.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined,
      })),
    }
    try {
      if (isEdit) {
        await updateServiceType.mutateAsync({ id: id!, input })
      } else {
        await createServiceType.mutateAsync(input)
      }
      show('Tipo de serviço salvo')
      navigate('/painel/tipos-de-servico')
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Erro ao salvar', 'error')
    }
  }

  return (
    <Card className="max-w-2xl">
      <h1 className="mb-lg font-display text-display-sm">{isEdit ? 'Editar tipo de serviço' : 'Novo tipo de serviço'}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-md">
        <Input label="Nome" id="name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Duração (minutos)"
          id="durationMinutes"
          type="number"
          error={errors.durationMinutes?.message}
          {...register('durationMinutes')}
        />
        <Input label="Descrição (opcional)" id="description" {...register('description')} />

        <label className="flex items-center gap-xs font-sans text-body-sm text-body">
          <input type="checkbox" {...register('requiresCustomForm')} />
          Exige formulário customizado
        </label>

        {requiresCustomForm && (
          <div className="flex flex-col gap-sm rounded-md border border-hairline p-md">
            <p className="font-sans text-title-sm">Campos do formulário</p>
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-xs rounded-sm border border-hairline-soft p-sm">
                <Input
                  label={`Rótulo do campo ${index + 1}`}
                  id={`customFields.${index}.label`}
                  error={errors.customFields?.[index]?.label?.message}
                  {...register(`customFields.${index}.label` as const)}
                />
                <label className="font-sans text-body-sm text-body">
                  Tipo
                  <select className="ml-xs rounded-md border border-hairline p-xs" {...register(`customFields.${index}.fieldType` as const)}>
                    <option value="TEXT">Texto</option>
                    <option value="NUMBER">Número</option>
                    <option value="SELECT">Seleção</option>
                    <option value="TEXTAREA">Texto longo</option>
                  </select>
                </label>
                <Input label="Opções (separadas por vírgula, só para Seleção)" id={`customFields.${index}.options`} {...register(`customFields.${index}.options` as const)} />
                <label className="flex items-center gap-xs font-sans text-body-sm text-body">
                  <input type="checkbox" {...register(`customFields.${index}.required` as const)} />
                  Obrigatório
                </label>
                <Button variant="text-link" type="button" onClick={() => remove(index)}>
                  Remover campo
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ label: '', fieldType: 'TEXT', required: false, order: fields.length, options: '' })}
            >
              Adicionar campo
            </Button>
          </div>
        )}

        <div className="flex gap-sm">
          <Button type="submit">Salvar</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/painel/tipos-de-servico')}>
            Cancelar
          </Button>
        </div>
      </form>
      {isEdit && (
        <div className="mt-lg border-t border-hairline pt-lg">
          <h2 className="mb-md font-sans text-title-md">Disponibilidade específica deste tipo de serviço</h2>
          <p className="mb-md font-sans text-body-sm text-muted">
            Se configurada, substitui a disponibilidade geral apenas para este tipo de serviço.
          </p>
          <WeeklyScheduleEditor value={rules} onChange={setRules} />
          <Button className="mt-md" onClick={() => saveRules.mutate(rules)}>
            Salvar regras de disponibilidade
          </Button>
        </div>
      )}
    </Card>
  )
}
