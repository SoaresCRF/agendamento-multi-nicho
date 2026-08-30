import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePublicProfile, usePublicServiceTypes } from './usePublicBooking'
import { ServiceTypeSelector } from './ServiceTypeSelector'

type Step = 'select-service' | 'pick-slot' | 'form' | 'confirmed'

export function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: profile } = usePublicProfile(slug!)
  const { data: serviceTypes } = usePublicServiceTypes(slug!)
  const [step, setStep] = useState<Step>('select-service')
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

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

        {step === 'pick-slot' && selectedServiceType && (
          <div>
            <h2 className="mb-md font-display text-display-md">Escolha um horário</h2>
            {/* Task 15 fills in the calendar + slot grid here, using selectedServiceType and setSelectedSlot/setStep('form') */}
          </div>
        )}
      </div>
    </div>
  )
}
