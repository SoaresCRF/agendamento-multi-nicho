import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '../../../components/Input'
import { Textarea } from '../../../components/Textarea'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { useMe } from '../../../lib/useMe'
import { useToast } from '../../../components/toast/useToast'
import { api, ApiError } from '../../../lib/api'
import { useDocumentTitle } from '../../../lib/useDocumentTitle'
import { cropImageToSquareDataUrl } from '../../../lib/image-crop'
import type { MeResponse } from '../../../lib/types'

const BIO_MAX_LENGTH = 280
// The avatar never renders larger than 96px (public hero) anywhere in the
// product; a direct upload is cropped to 2x that for retina screens — no
// reason to ship/store anything bigger since we control this path end to end.
const PHOTO_CROP_TARGET_PX = 192
// Threshold for the non-blocking size warning on a *pasted external URL*, where
// we don't control the source image and can't resize it ourselves.
const PHOTO_MAX_DIMENSION_PX = 1000
const PHOTO_MAX_UPLOAD_MB = 2
const PHOTO_MAX_UPLOAD_BYTES = PHOTO_MAX_UPLOAD_MB * 1024 * 1024

// Mirrors server/src/modules/users/users.schemas.ts exactly.
const profileFormSchema = z.object({
  profilePhotoUrl: z.union([
    z.literal(''),
    z.string().url('URL inválida').startsWith('https://', 'A URL da foto deve começar com https://'),
    z.string().startsWith('data:image/', 'Formato de imagem não suportado'),
  ]),
  bio: z.string().max(BIO_MAX_LENGTH, `Biografia deve ter no máximo ${BIO_MAX_LENGTH} caracteres`),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const EMPTY_FORM: ProfileFormValues = { profilePhotoUrl: '', bio: '' }

export function ProfilePage() {
  useDocumentTitle('Perfil')
  const { show } = useToast()
  const { data: me } = useMe()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileFormSchema), defaultValues: EMPTY_FORM })

  const profilePhotoUrl = watch('profilePhotoUrl')
  const bio = watch('bio')
  const [oversizedPhoto, setOversizedPhoto] = useState<{ width: number; height: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onPhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    clearErrors('profilePhotoUrl')
    if (!file.type.startsWith('image/')) {
      setError('profilePhotoUrl', { message: 'Selecione um arquivo de imagem' })
      return
    }
    if (file.size > PHOTO_MAX_UPLOAD_BYTES) {
      setError('profilePhotoUrl', { message: `Imagem deve ter no máximo ${PHOTO_MAX_UPLOAD_MB}MB` })
      return
    }

    try {
      const dataUrl = await cropImageToSquareDataUrl(file, PHOTO_CROP_TARGET_PX)
      setValue('profilePhotoUrl', dataUrl, { shouldDirty: true, shouldValidate: true })
      setOversizedPhoto(null)
    } catch {
      setError('profilePhotoUrl', { message: 'Não foi possível processar a imagem' })
    }
  }

  // Only re-seed from the server while the user hasn't started editing —
  // otherwise a background refetch silently discards an in-progress edit.
  useEffect(() => {
    if (me && !isDirty) {
      reset({ profilePhotoUrl: me.profilePhotoUrl ?? '', bio: me.bio ?? '' })
    }
  }, [me, reset, isDirty])

  const updateProfile = useMutation({
    mutationFn: (input: { profilePhotoUrl: string | null; bio: string | null }) =>
      api.patch<MeResponse>('/api/me', input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated)
      show('Perfil salvo')
    },
    onError: (err) => show(err instanceof ApiError ? err.message : 'Erro ao salvar', 'error'),
  })

  function onSubmit(values: ProfileFormValues) {
    updateProfile.mutate({
      profilePhotoUrl: values.profilePhotoUrl || null,
      bio: values.bio || null,
    })
  }

  return (
    <Card className="max-w-2xl">
      <h1 className="mb-lg font-display text-display-sm">Perfil</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-md">
        <div className="flex items-end gap-sm">
          {profilePhotoUrl && (
            <img
              src={profilePhotoUrl}
              alt="Pré-visualização da foto"
              className="h-11 w-11 shrink-0 rounded-full border border-hairline object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget
                setOversizedPhoto(
                  naturalWidth > PHOTO_MAX_DIMENSION_PX || naturalHeight > PHOTO_MAX_DIMENSION_PX
                    ? { width: naturalWidth, height: naturalHeight }
                    : null,
                )
              }}
            />
          )}
          <div className="flex flex-1 flex-col gap-sm">
            <Input
              label="URL da foto (opcional)"
              id="profilePhotoUrl"
              type="url"
              aria-invalid={errors.profilePhotoUrl?.message ? 'true' : undefined}
              aria-describedby={errors.profilePhotoUrl?.message ? 'profilePhotoUrl-error' : undefined}
              {...register('profilePhotoUrl')}
            />
            <div className="flex flex-col gap-xxs">
              <label htmlFor="profilePhotoFile" className="font-sans text-body-sm text-body">
                Ou envie um arquivo (máx. {PHOTO_MAX_UPLOAD_MB}MB, recomendado)
              </label>
              <input
                ref={fileInputRef}
                id="profilePhotoFile"
                type="file"
                accept="image/*"
                aria-describedby={errors.profilePhotoUrl?.message ? 'profilePhotoUrl-error' : undefined}
                onChange={onPhotoFileChange}
                className="font-sans text-body-sm text-body file:mr-sm file:rounded-md file:border file:border-hairline file:bg-surface file:px-sm file:py-xxs file:font-sans file:text-body-sm"
              />
            </div>
            {errors.profilePhotoUrl?.message && (
              <span id="profilePhotoUrl-error" className="font-sans text-body-sm text-error">
                {errors.profilePhotoUrl.message}
              </span>
            )}
          </div>
        </div>
        {oversizedPhoto && (
          <p className="-mt-xs font-sans text-body-sm text-warning">
            Imagem grande ({oversizedPhoto.width}×{oversizedPhoto.height}px) pode deixar sua página lenta para carregar.
            Recomendamos uma imagem de até {PHOTO_MAX_DIMENSION_PX}px.
          </p>
        )}
        <div>
          <Textarea
            label="Biografia (opcional)"
            id="bio"
            maxLength={BIO_MAX_LENGTH}
            error={errors.bio?.message}
            descriptionId="bio-count"
            {...register('bio')}
          />
          <p id="bio-count" className="mt-xxs text-right font-sans text-caption text-muted">
            {bio.length}/{BIO_MAX_LENGTH}
          </p>
        </div>
        <div>
          <Button type="submit" disabled={updateProfile.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </Card>
  )
}
