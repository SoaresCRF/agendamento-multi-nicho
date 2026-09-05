import { describe, it, expect, vi, beforeEach } from 'vitest'

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
})
