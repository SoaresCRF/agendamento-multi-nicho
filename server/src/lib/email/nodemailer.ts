import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../env'
import { logger } from '../logger'
import type { Mailer, SendMailInput } from './index'

let transporter: Transporter | null = null
let usingRealSmtp = false

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter
  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) {
    usingRealSmtp = true
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
    return transporter
  }
  // No SMTP_* configured (local dev): fall back to a throwaway Ethereal preview
  // account so email-sending code paths still work without real credentials.
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
    if (usingRealSmtp) {
      logger.info('Email sent', { messageId: info.messageId })
    } else {
      logger.info('Email sent (preview)', { url: nodemailer.getTestMessageUrl(info) })
    }
  },
}
