import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/toast/useToast'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

const resetPasswordFormSchema = z
  .object({
    password: z.string().min(10, 'A senha precisa ter ao menos 10 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

export function ResetPasswordPage() {
  useDocumentTitle('Redefinir senha')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { show } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordFormSchema) })
  const [serverError, setServerError] = useState<string | null>(null)

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null)
    try {
      await api.post('/api/auth/reset-password', { token, password: values.password })
      show('Senha redefinida. Faça login com a nova senha.')
      navigate('/login', { replace: true })
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao redefinir a senha')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-xl">
        <h1 className="mb-lg font-display text-display-sm">Redefinir senha</h1>
        {!token ? (
          <p className="font-sans text-body-md text-body">
            Link inválido.{' '}
            <Link to="/esqueci-senha" className="text-primary">
              Solicite um novo link
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-md">
            <Input
              label="Nova senha"
              id="password"
              type="password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirmar senha"
              id="confirmPassword"
              type="password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            {serverError && <p className="font-sans text-body-sm text-error">{serverError}</p>}
            <Button type="submit">Redefinir senha</Button>
          </form>
        )}
      </div>
    </div>
  )
}
