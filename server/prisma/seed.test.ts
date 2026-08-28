import { describe, it, expect } from 'vitest'
import { prisma } from '../src/lib/prisma'

describe('seed data', () => {
  it('created both demo professionals with their service types', async () => {
    const joana = await prisma.user.findUnique({
      where: { slug: 'joana-psicologa' },
      include: { serviceTypes: { include: { customFields: true } } },
    })
    expect(joana).not.toBeNull()
    expect(joana?.niche).toBe('Psicologia')
    expect(joana?.serviceTypes).toHaveLength(2)
    const anamnese = joana?.serviceTypes.find((s) => s.requiresCustomForm)
    expect(anamnese?.customFields).toHaveLength(3)

    const carlos = await prisma.user.findUnique({ where: { slug: 'carlos-personal' } })
    expect(carlos).not.toBeNull()
    expect(carlos?.niche).toBe('Personal Trainer')
  })
})
