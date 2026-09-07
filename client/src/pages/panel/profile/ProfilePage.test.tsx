import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ProfilePage } from './ProfilePage'
import { ToastProvider } from '../../../components/toast/ToastProvider'

const ME_RESPONSE = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@example.com',
  slug: 'ana',
  timezone: 'America/Sao_Paulo',
  niche: 'Psicologia',
  profilePhotoUrl: null,
  bio: null,
}

function renderPage(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ProfilePage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pre-fills the form with the current profile', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch

    renderPage()

    expect(await screen.findByLabelText('Biografia (opcional)')).toHaveValue('')
    expect(screen.getByLabelText('URL da foto (opcional)')).toHaveValue('')
  })

  it('submits profilePhotoUrl and bio via PATCH', async () => {
    let patched: Partial<typeof ME_RESPONSE> | null = null
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === 'PATCH') {
        patched = JSON.parse(opts.body as string)
        return Promise.resolve(new Response(JSON.stringify({ ...ME_RESPONSE, ...patched }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify(ME_RESPONSE), { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()

    await screen.findByLabelText('Biografia (opcional)')
    await userEvent.type(screen.getByLabelText('URL da foto (opcional)'), 'https://example.com/foto.jpg')
    await userEvent.type(screen.getByLabelText('Biografia (opcional)'), 'Psicóloga clínica há 10 anos.')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(patched).toMatchObject({
        profilePhotoUrl: 'https://example.com/foto.jpg',
        bio: 'Psicóloga clínica há 10 anos.',
      }),
    )
  })

  it('rejects a non-https photo URL client-side', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch

    renderPage()

    await screen.findByLabelText('Biografia (opcional)')
    await userEvent.type(screen.getByLabelText('URL da foto (opcional)'), 'http://example.com/foto.jpg')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('A URL da foto deve começar com https://')).toBeInTheDocument()
  })
})
