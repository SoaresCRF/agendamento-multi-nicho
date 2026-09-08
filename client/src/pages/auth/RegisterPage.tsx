import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import type { AuthUser } from '../../lib/types'

// Brazil currently has 4 distinct UTC offsets; one canonical IANA zone per
// offset is enough — no need to list all ~16 Brazilian tzdata entries that
// share identical rules since DST was abolished nationwide in 2019.
const BRAZIL_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília, São Paulo, Rio de Janeiro (UTC-3)' },
  { value: 'America/Manaus', label: 'Amazonas, Mato Grosso (UTC-4)' },
  { value: 'America/Rio_Branco', label: 'Acre (UTC-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
] as const
const BRAZIL_TIMEZONE_VALUES = BRAZIL_TIMEZONES.map((tz) => tz.value) as [string, ...string[]]

// Mirrors server/src/modules/auth/auth.schemas.ts's registerSchema; the server
// still accepts any non-empty string, but the client only ever offers one of
// the pre-defined zones above, so a fixed enum is enough here.
const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres'),
  slug: z
    .string()
    .min(3, 'O slug precisa ter ao menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  timezone: z.enum(BRAZIL_TIMEZONE_VALUES, { errorMap: () => ({ message: 'Selecione um fuso horário' }) }),
  niche: z.string().optional(),
})

type RegisterFormValues = z.infer<typeof registerSchema>

interface RegisterResponse {
  user: AuthUser
  accessToken: string
}

export function RegisterPage() {
  useDocumentTitle('Criar conta')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { timezone: 'America/Sao_Paulo' },
  })
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null)
    try {
      const result = await api.post<RegisterResponse>('/api/auth/register', values)
      login(result.user, result.accessToken)
      navigate('/painel', { replace: true })
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao criar conta')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-xl">
        <h1 className="mb-lg font-display text-display-sm">Criar conta</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-md">
          <Input label="Nome" id="name" error={errors.name?.message} {...register('name')} />
          <Input label="E-mail" id="email" type="email" error={errors.email?.message} {...register('email')} />
          <Input
            label="Senha"
            id="password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input label="Slug (URL pública)" id="slug" error={errors.slug?.message} {...register('slug')} />
          <div className="flex flex-col gap-xxs">
            <label htmlFor="timezone" className="font-sans text-body-sm text-body">
              Fuso horário
            </label>
            <select
              id="timezone"
              aria-invalid={errors.timezone ? 'true' : undefined}
              aria-describedby={errors.timezone ? 'timezone-error' : undefined}
              className="h-11 rounded-md border border-hairline bg-surface px-[14px] font-sans text-body-md text-ink focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              {...register('timezone')}
            >
              {BRAZIL_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            {errors.timezone?.message && (
              <span id="timezone-error" className="font-sans text-body-sm text-error">
                {errors.timezone.message}
              </span>
            )}
          </div>
          <Input label="Nicho (opcional)" id="niche" {...register('niche')} />
          {serverError && <p className="font-sans text-body-sm text-error">{serverError}</p>}
          <Button type="submit">Criar conta</Button>
        </form>
        <p className="mt-md font-sans text-body-sm text-muted">
          Já tem conta?{' '}
          <Link to="/login" className="text-primary">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
