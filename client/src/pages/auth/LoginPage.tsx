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

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginResponse {
  user: AuthUser
  accessToken: string
}

export function LoginPage() {
  useDocumentTitle('Entrar')
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)
    try {
      const result = await api.post<LoginResponse>('/api/auth/login', values)
      login(result.user, result.accessToken)
      navigate('/painel', { replace: true })
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao entrar')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-xl">
        <h1 className="mb-lg font-display text-display-sm">Entrar</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-md">
          <Input label="E-mail" id="email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Senha" id="password" type="password" error={errors.password?.message} {...register('password')} />
          {serverError && <p className="font-sans text-body-sm text-error">{serverError}</p>}
          <Button type="submit">Entrar</Button>
        </form>
        <p className="mt-md font-sans text-body-sm text-muted">
          Não tem conta? <Link to="/registro" className="text-primary">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
