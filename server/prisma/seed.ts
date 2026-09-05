import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const SALT_ROUNDS = 12

async function main() {
  // Local/dev default is the public 'demo1234' documented in the README. Production
  // must set SEED_DEMO_PASSWORD to a value that is never committed or documented,
  // since these two demo profiles are publicly bookable and their panel would
  // otherwise be editable by anyone who read the README.
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_DEMO_PASSWORD) {
    throw new Error('SEED_DEMO_PASSWORD must be set before seeding production — do not reuse demo1234 there')
  }
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'demo1234'
  const passwordHash = await bcrypt.hash(demoPassword, SALT_ROUNDS)

  const psicologa = await prisma.user.upsert({
    where: { email: 'joana@example.com' },
    update: {},
    create: {
      name: 'Joana Silva',
      email: 'joana@example.com',
      passwordHash,
      slug: 'joana-psicologa',
      timezone: 'America/Sao_Paulo',
      niche: 'Psicologia',
      availability: {
        create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '18:00' })),
      },
      serviceTypes: {
        create: [
          {
            name: 'Primeira consulta',
            durationMinutes: 60,
            description: 'Sessão inicial de anamnese',
            requiresCustomForm: true,
            customFields: {
              create: [
                { label: 'Queixa principal', fieldType: 'TEXTAREA', required: true, order: 0 },
                {
                  label: 'Já fez terapia antes?',
                  fieldType: 'SELECT',
                  required: true,
                  order: 1,
                  options: ['Sim', 'Não'],
                },
                { label: 'Está em uso de medicação?', fieldType: 'TEXT', required: false, order: 2 },
              ],
            },
          },
          { name: 'Sessão de retorno', durationMinutes: 50, requiresCustomForm: false },
        ],
      },
    },
  })

  const personalTrainer = await prisma.user.upsert({
    where: { email: 'carlos@example.com' },
    update: {},
    create: {
      name: 'Carlos Souza',
      email: 'carlos@example.com',
      passwordHash,
      slug: 'carlos-personal',
      timezone: 'America/Sao_Paulo',
      niche: 'Personal Trainer',
      availability: {
        create: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, startTime: '06:00', endTime: '20:00' })),
      },
      serviceTypes: {
        create: [
          {
            name: 'Avaliação física',
            durationMinutes: 90,
            requiresCustomForm: true,
            customFields: {
              create: [
                { label: 'Objetivo', fieldType: 'TEXT', required: true, order: 0 },
                { label: 'Lesões ou restrições', fieldType: 'TEXTAREA', required: false, order: 1 },
                {
                  label: 'Nível de atividade atual',
                  fieldType: 'SELECT',
                  required: true,
                  order: 2,
                  options: ['Sedentário', 'Leve', 'Moderado', 'Intenso'],
                },
              ],
            },
          },
          { name: 'Treino', durationMinutes: 60, requiresCustomForm: false },
        ],
      },
    },
  })

  console.log({ psicologa: psicologa.slug, personalTrainer: personalTrainer.slug })
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
