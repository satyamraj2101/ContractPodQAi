import { EmptyState } from '../EmptyState'

export default function EmptyStateExample() {
  return (
    <div className="h-96 space-y-8">
      <EmptyState type="chat" />
      <EmptyState type="documents" onAction={() => console.log('Upload clicked')} />
    </div>
  )
}
