import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { api, ApiError } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

const forgotPasswordSchema = z.object({ email: z.string().email('E-mail inválido') })

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  useDocumentTitle('Esqueci minha senha')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null)

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null)
    try {
      const result = await api.post<{ message: string }>('/api/auth/forgot-password', values)
      setConfirmationMessage(result.message)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao enviar o link')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-xl">
        <h1 className="mb-lg font-display text-display-sm">Esqueci minha senha</h1>
        {confirmationMessage ? (
          <p className="font-sans text-body-md text-body">{confirmationMessage}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-md">
            <Input label="E-mail" id="email" type="email" error={errors.email?.message} {...register('email')} />
            {serverError && <p className="font-sans text-body-sm text-error">{serverError}</p>}
            <Button type="submit">Enviar link</Button>
          </form>
        )}
        <p className="mt-md font-sans text-body-sm text-muted">
          <Link to="/login" className="text-primary">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
