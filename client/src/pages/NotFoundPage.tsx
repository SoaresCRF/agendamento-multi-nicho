import { EmptyState } from '../components/EmptyState'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-lg">
      <EmptyState title="Página não encontrada" description="Verifique o endereço e tente novamente." />
    </div>
  )
}
