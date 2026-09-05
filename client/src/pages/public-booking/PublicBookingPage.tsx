import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { usePublicProfile, usePublicServiceTypes, usePublicSlots, useCreateBooking } from './usePublicBooking'
import { ServiceTypeSelector } from './ServiceTypeSelector'
import { CalendarPicker } from './CalendarPicker'
import { SlotGrid } from './SlotGrid'
import { BookingForm } from './BookingForm'
import { ApiError } from '../../lib/api'
import { formatInTimeZone } from 'date-fns-tz'
import { EmptyState } from '../../components/EmptyState'
import { Badge, toneForNiche } from '../../components/Badge'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useCanonicalUrl } from '../../lib/useCanonicalUrl'

type Step = 'select-service' | 'pick-slot' | 'form' | 'confirmed'

export function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const queryClient = useQueryClient()
  const { data: profile, isLoading: isProfileLoading, isError: isProfileError } = usePublicProfile(slug!)
  useDocumentTitle(profile?.name ?? 'Agendar horário')
  useCanonicalUrl(`${window.location.origin}/${slug}`)
  const {
    data: serviceTypes,
    isLoading: isServiceTypesLoading,
    isError: isServiceTypesError,
  } = usePublicServiceTypes(slug!)
  const [step, setStep] = useState<Step>('select-service')
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const createBooking = useCreateBooking(slug!)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const effectiveDate =
    selectedDate ??
    (profile
      ? formatInTimeZone(new Date(), profile.timezone, 'yyyy-MM-dd')
      : formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd'))
  const { data: slots } = usePublicSlots(slug!, selectedServiceTypeId, effectiveDate)

  function handleSelectServiceType(id: string) {
    setSelectedServiceTypeId(id)
    setSelectedSlot(null)
    setStep('pick-slot')
  }

  async function handleBookingSubmit(values: {
    clientName: string
    clientEmail: string
    formResponses: Record<string, unknown>
  }) {
    if (!selectedServiceTypeId || !selectedSlot) return
    setBookingError(null)
    try {
      await createBooking.mutateAsync({
        serviceTypeId: selectedServiceTypeId,
        startsAt: selectedSlot,
        clientName: values.clientName,
        clientEmail: values.clientEmail,
        formResponses: values.formResponses,
      })
      setStep('confirmed')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setBookingError('Esse horário acabou de ser reservado — escolha outro.')
        setSelectedSlot(null)
        setStep('pick-slot')
        queryClient.invalidateQueries({ queryKey: ['public', slug, 'slots', selectedServiceTypeId, effectiveDate] })
      } else {
        setBookingError(err instanceof ApiError ? err.message : 'Erro ao confirmar agendamento')
      }
    }
  }

  const selectedServiceType = serviceTypes?.find((st) => st.id === selectedServiceTypeId) ?? null

  if (isProfileLoading || isServiceTypesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="font-sans text-body-md text-muted">Carregando…</p>
      </div>
    )
  }

  if (isProfileError || isServiceTypesError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-lg">
        <EmptyState title="Página não encontrada" description="Verifique o link e tente novamente." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-secondary-dark px-lg py-section text-center text-on-secondary-dark">
        <h1 className="font-display text-display-lg">{profile?.name}</h1>
        {profile?.niche && (
          <Badge tone={toneForNiche(profile.niche)} className="mt-xs">
            {profile.niche}
          </Badge>
        )}
      </header>

      <main className="mx-auto max-w-[720px] px-lg py-xl">
        {bookingError && <p className="mb-md font-sans text-body-sm text-error">{bookingError}</p>}

        {step === 'select-service' && serviceTypes && (
          <>
            <h2 className="mb-md font-display text-display-md">Escolha um tipo de serviço</h2>
            <ServiceTypeSelector
              serviceTypes={serviceTypes}
              selectedId={selectedServiceTypeId}
              onSelect={handleSelectServiceType}
            />
          </>
        )}

        {step === 'pick-slot' && selectedServiceType && profile && (
          <div>
            <h2 className="mb-md font-display text-display-md">Escolha um horário</h2>
            <div className="flex flex-col gap-lg sm:flex-row">
              <CalendarPicker selectedDate={effectiveDate} onSelectDate={setSelectedDate} timezone={profile.timezone} />
              <div className="flex-1">
                {slots && slots.length === 0 && (
                  <p className="font-sans text-body-sm text-muted">Nenhum horário disponível neste dia.</p>
                )}
                {slots && slots.length > 0 && (
                  <SlotGrid
                    slots={slots}
                    selectedSlot={selectedSlot}
                    onSelectSlot={(iso) => {
                      setSelectedSlot(iso)
                      setStep('form')
                    }}
                    timezone={profile.timezone}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'form' && selectedServiceType && (
          <div>
            <h2 className="mb-md font-display text-display-md">Seus dados</h2>
            <BookingForm
              serviceType={selectedServiceType}
              professionalName={profile.name}
              onSubmit={handleBookingSubmit}
              isSubmitting={createBooking.isPending}
            />
          </div>
        )}

        {step === 'confirmed' && (
          <div className="text-center">
            <h2 className="mb-sm font-display text-display-md">Agendamento confirmado!</h2>
            <p className="font-sans text-body-md text-muted">Você receberá um e-mail de confirmação em breve.</p>
          </div>
        )}
      </main>
    </div>
  )
}
