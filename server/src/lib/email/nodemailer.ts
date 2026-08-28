import nodemailer, { type Transporter } from 'nodemailer'
import { logger } from '../logger'
import type { Mailer, SendMailInput } from './index'

let transporter: Transporter | null = null

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter
  const testAccount = await nodemailer.createTestAccount()
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })
  return transporter
}

export const nodemailerMailer: Mailer = {
  async sendMail(input: SendMailInput) {
    const t = await getTransporter()
    const info = await t.sendMail({ from: 'Agendamento <agendamento@example.com>', ...input })
    logger.info('Email sent (preview)', { url: nodemailer.getTestMessageUrl(info) })
  },
}
