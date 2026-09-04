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

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// Mirrors server/src/modules/auth/auth.schemas.ts's registerSchema, plus a
// client-only IANA check: the server accepts any non-empty string, and an
// invalid zone (e.g. "Brasilia") crashes every formatInTimeZone call in the
// app with no ErrorBoundary to catch it downstream.
const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres'),
  slug: z
    .string()
    .min(3, 'O slug precisa ter ao menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  timezone: z
    .string()
    .min(1, 'Fuso horário é obrigatório')
    .refine(isValidTimeZone, 'Fuso horário inválido (ex: America/Sao_Paulo)'),
  niche: z.string().optional(),
})

type RegisterFormValues = z.infer<typeof registerSchema>

interface RegisterResponse {
  user: AuthUser
  accessToken: string
}

export function RegisterPage() {
  useDocumentTitle('Criar conta')
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
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
          <Input label="Senha" id="password" type="password" error={errors.password?.message} {...register('password')} />
          <Input label="Slug (URL pública)" id="slug" error={errors.slug?.message} {...register('slug')} />
          <Input label="Fuso horário" id="timezone" placeholder="America/Sao_Paulo" error={errors.timezone?.message} {...register('timezone')} />
          <Input label="Nicho (opcional)" id="niche" {...register('niche')} />
          {serverError && <p className="font-sans text-body-sm text-error">{serverError}</p>}
          <Button type="submit">Criar conta</Button>
        </form>
        <p className="mt-md font-sans text-body-sm text-muted">
          Já tem conta? <Link to="/login" className="text-primary">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
