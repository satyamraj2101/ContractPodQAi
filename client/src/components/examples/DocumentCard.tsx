import { DocumentCard } from '../DocumentCard'

export default function DocumentCardExample() {
  return (
    <div className="p-4 space-y-3">
      <DocumentCard
        id="1"
        filename="ContractPodAI_User_Guide.pdf"
        fileType="PDF"
        fileSize="2.4 MB"
        uploadDate="Oct 5, 2025"
        onView={() => console.log('View clicked')}
        onDownload={() => console.log('Download clicked')}
      />
      <DocumentCard
        id="2"
        filename="API_Integration_Guide.pdf"
        fileType="PDF"
        fileSize="1.8 MB"
        uploadDate="Oct 3, 2025"
        onView={() => console.log('View clicked')}
        onDownload={() => console.log('Download clicked')}
      />
    </div>
  )
}
