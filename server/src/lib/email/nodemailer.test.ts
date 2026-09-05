import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'abc' })
const createTestAccountMock = vi.fn().mockResolvedValue({
  smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
  user: 'user@ethereal.email',
  pass: 'pass',
})
const createTransportMock = vi.fn().mockReturnValue({ sendMail: sendMailMock })

vi.mock('nodemailer', () => ({
  default: {
    createTestAccount: (...args: unknown[]) => createTestAccountMock(...args),
    createTransport: (...args: unknown[]) => createTransportMock(...args),
    getTestMessageUrl: () => 'https://ethereal.email/preview/abc',
  },
}))

vi.mock('../env', () => ({ env: {} }))

describe('nodemailerMailer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('lazily creates an Ethereal transport and sends through it', async () => {
    const { nodemailerMailer } = await import('./nodemailer')
    await nodemailerMailer.sendMail({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' })
    expect(createTestAccountMock).toHaveBeenCalledOnce()
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    )
  })

  it('reuses the same transport across multiple sends', async () => {
    const { nodemailerMailer } = await import('./nodemailer')
    await nodemailerMailer.sendMail({ to: 'a@example.com', subject: 'One', html: '<p>1</p>' })
    await nodemailerMailer.sendMail({ to: 'b@example.com', subject: 'Two', html: '<p>2</p>' })
    expect(createTestAccountMock).toHaveBeenCalledOnce()
    expect(sendMailMock).toHaveBeenCalledTimes(2)
  })

  describe('with SMTP_* configured', () => {
    afterEach(() => {
      vi.doUnmock('../env')
    })

    it('uses a real SMTP transport instead of Ethereal', async () => {
      vi.doMock('../env', () => ({
        env: { SMTP_HOST: 'smtp.example.com', SMTP_PORT: 465, SMTP_USER: 'u', SMTP_PASS: 'p' },
      }))
      const { nodemailerMailer } = await import('./nodemailer')
      await nodemailerMailer.sendMail({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' })
      expect(createTestAccountMock).not.toHaveBeenCalled()
      expect(createTransportMock).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: { user: 'u', pass: 'p' },
        }),
      )
    })
  })
})
