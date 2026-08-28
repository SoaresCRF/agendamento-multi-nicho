export interface SendMailInput {
  to: string
  subject: string
  html: string
}

export interface Mailer {
  sendMail(input: SendMailInput): Promise<void>
}
