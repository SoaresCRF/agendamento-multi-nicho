import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePublicProfile, usePublicServiceTypes, usePublicSlots } from './usePublicBooking'
import { ServiceTypeSelector } from './ServiceTypeSelector'
import { CalendarPicker } from './CalendarPicker'
import { SlotGrid } from './SlotGrid'
import { formatInTimeZone } from 'date-fns-tz'

type Step = 'select-service' | 'pick-slot' | 'form' | 'confirmed'

export function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: profile } = usePublicProfile(slug!)
  const { data: serviceTypes } = usePublicServiceTypes(slug!)
  const [step, setStep] = useState<Step>('select-service')
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd')
  )
  const { data: slots } = usePublicSlots(slug!, selectedServiceTypeId, selectedDate)

  function handleSelectServiceType(id: string) {
    setSelectedServiceTypeId(id)
    setSelectedSlot(null)
    setStep('pick-slot')
  }

  const selectedServiceType = serviceTypes?.find((st) => st.id === selectedServiceTypeId) ?? null

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-secondary-dark px-lg py-section text-center text-on-secondary-dark">
        <h1 className="font-display text-display-lg">{profile?.name}</h1>
        {profile?.niche && <p className="mt-xs font-sans text-body-md">{profile.niche}</p>}
      </div>

      <div className="mx-auto max-w-[720px] px-lg py-xl">
        {step === 'select-service' && serviceTypes && (
          <>
            <h2 className="mb-md font-display text-display-md">Escolha um tipo de serviço</h2>
            <ServiceTypeSelector serviceTypes={serviceTypes} selectedId={selectedServiceTypeId} onSelect={handleSelectServiceType} />
          </>
        )}

        {step === 'pick-slot' && selectedServiceType && profile && (
          <div>
            <h2 className="mb-md font-display text-display-md">Escolha um horário</h2>
            <div className="flex flex-col gap-lg sm:flex-row">
              <CalendarPicker selectedDate={selectedDate} onSelectDate={setSelectedDate} timezone={profile.timezone} />
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
      </div>
    </div>
  )
}
