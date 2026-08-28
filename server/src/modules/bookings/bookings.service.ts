import { Prisma } from '@prisma/client'
import { addMinutes } from 'date-fns'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import type { Mailer } from '../../lib/email'
import { nodemailerMailer } from '../../lib/email/nodemailer'
import { validateFormResponses } from './form-validation'

export interface CreateBookingInput {
  serviceTypeId: string
  startsAt: string
  clientName: string
  clientEmail: string
  formResponses?: Record<string, unknown>
}

const SLOT_TAKEN_MESSAGE = 'Esse horário acabou de ser reservado, escolha outro.'

export async function createPublicBooking(
  slug: string,
  input: CreateBookingInput,
  mailer: Mailer = nodemailerMailer
) {
  const user = await prisma.user.findUnique({ where: { slug } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')

  const serviceType = await prisma.serviceType.findFirst({
    where: { id: input.serviceTypeId, userId: user.id },
    include: { customFields: true },
  })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')

  const startsAt = new Date(input.startsAt)
  const endsAt = addMinutes(startsAt, serviceType.durationMinutes)

  const validatedResponses = serviceType.requiresCustomForm
    ? validateFormResponses(
        serviceType.customFields.map((f) => ({
          ...f,
          options: Array.isArray(f.options) ? (f.options as string[]) : null,
        })),
        input.formResponses ?? {}
      )
    : undefined

  const conflict = await prisma.booking.findFirst({
    where: { userId: user.id, status: 'CONFIRMED', startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
  })
  if (conflict) throw new AppError(409, SLOT_TAKEN_MESSAGE)

  let booking
  try {
    booking = await prisma.booking.create({
      data: {
        userId: user.id, serviceTypeId: serviceType.id,
        clientName: input.clientName, clientEmail: input.clientEmail,
        startsAt, endsAt,
        formResponses: validatedResponses as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.toLowerCase().includes('exclusion constraint')) {
      throw new AppError(409, SLOT_TAKEN_MESSAGE)
    }
    throw err
  }

  await Promise.all([
    mailer.sendMail({
      to: input.clientEmail,
      subject: `Agendamento confirmado com ${user.name}`,
      html: `<p>Seu agendamento de "${serviceType.name}" foi confirmado para ${startsAt.toISOString()}.</p>`,
    }),
    mailer.sendMail({
      to: user.email,
      subject: `Novo agendamento: ${input.clientName}`,
      html: `<p>${input.clientName} agendou "${serviceType.name}" para ${startsAt.toISOString()}.</p>`,
    }),
  ]).catch((err) => {
    logger.error('Failed to send booking confirmation emails', { message: err instanceof Error ? err.message : String(err) })
  })

  return booking
}
