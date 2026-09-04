import { EmptyState } from '../components/EmptyState'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada')
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-lg">
      <EmptyState title="Página não encontrada" description="Verifique o endereço e tente novamente." />
    </div>
  )
}
