import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ProfilePage } from './ProfilePage'
import { ToastProvider } from '../../../components/toast/ToastProvider'
import * as imageCrop from '../../../lib/image-crop'

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

  it('crops an uploaded photo to the actual display size, not the pasted-URL warning threshold', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch
    const cropSpy = vi.spyOn(imageCrop, 'cropImageToSquareDataUrl').mockResolvedValue('data:image/jpeg;base64,abc')

    renderPage()

    const fileInput = (await screen.findByLabelText(/Ou envie um arquivo/)) as HTMLInputElement
    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    await userEvent.upload(fileInput, file)

    await waitFor(() => expect(cropSpy).toHaveBeenCalledWith(file, 192))
  })

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

  it('shows a live avatar preview as the photo URL is typed', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch

    renderPage()

    await screen.findByLabelText('Biografia (opcional)')
    expect(screen.queryByAltText('Pré-visualização da foto')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('URL da foto (opcional)'), 'https://example.com/foto.jpg')

    expect(screen.getByAltText('Pré-visualização da foto')).toHaveAttribute('src', 'https://example.com/foto.jpg')
  })

  it('shows a character counter for the bio field', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch

    renderPage()

    const bio = await screen.findByLabelText('Biografia (opcional)')
    expect(screen.getByText('0/280')).toBeInTheDocument()

    await userEvent.type(bio, 'Olá')

    expect(screen.getByText('3/280')).toBeInTheDocument()
  })

  it('associates the bio counter with the textarea via aria-describedby, for screen readers', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch

    renderPage()

    const bio = await screen.findByLabelText('Biografia (opcional)')
    const describedBy = bio.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(screen.getByText('0/280')).toHaveAttribute('id', describedBy!)
  })

  it('warns when the pasted photo is much larger than needed for the avatar', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch

    renderPage()

    await screen.findByLabelText('Biografia (opcional)')
    await userEvent.type(screen.getByLabelText('URL da foto (opcional)'), 'https://example.com/foto.jpg')
    const preview = screen.getByAltText('Pré-visualização da foto')
    Object.defineProperty(preview, 'naturalWidth', { value: 3000, configurable: true })
    Object.defineProperty(preview, 'naturalHeight', { value: 2000, configurable: true })
    fireEvent.load(preview)

    expect(await screen.findByText(/imagem grande/i)).toBeInTheDocument()
  })

  it('does not warn when the pasted photo is a reasonable size', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch

    renderPage()

    await screen.findByLabelText('Biografia (opcional)')
    await userEvent.type(screen.getByLabelText('URL da foto (opcional)'), 'https://example.com/foto.jpg')
    const preview = screen.getByAltText('Pré-visualização da foto')
    Object.defineProperty(preview, 'naturalWidth', { value: 400, configurable: true })
    Object.defineProperty(preview, 'naturalHeight', { value: 400, configurable: true })
    fireEvent.load(preview)

    expect(screen.queryByText(/imagem grande/i)).not.toBeInTheDocument()
  })

  it('rejects an uploaded photo file larger than the recommended limit', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch

    renderPage()

    await screen.findByLabelText('Biografia (opcional)')
    const fileInput = screen.getByLabelText(/ou envie um arquivo/i)
    const oversizedFile = new File([new Uint8Array(3 * 1024 * 1024)], 'foto.jpg', { type: 'image/jpeg' })
    await userEvent.upload(fileInput, oversizedFile)

    expect(await screen.findByText('Imagem deve ter no máximo 2MB')).toBeInTheDocument()
  })

  it('rejects an uploaded file that is not an image', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ME_RESPONSE), { status: 200 })) as unknown as typeof fetch

    renderPage()

    await screen.findByLabelText('Biografia (opcional)')
    const fileInput = screen.getByLabelText(/ou envie um arquivo/i)
    const notAnImage = new File(['not an image'], 'doc.pdf', { type: 'application/pdf' })
    // The default userEvent instance silently drops files that don't match the
    // input's `accept` filter (as a real file picker dialog would); disable that
    // here so this code-level MIME check can be exercised directly.
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(fileInput, notAnImage)

    expect(await screen.findByText('Selecione um arquivo de imagem')).toBeInTheDocument()
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
