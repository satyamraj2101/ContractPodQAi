import { useState } from 'react'
import { UploadDialog } from '../UploadDialog'
import { Button } from '@/components/ui/button'

export default function UploadDialogExample() {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Open Upload Dialog</Button>
      <UploadDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
