import { DocumentSidebar } from '../DocumentSidebar'

export default function DocumentSidebarExample() {
  const mockDocuments = [
    {
      id: "1",
      filename: "ContractPodAI_User_Guide.pdf",
      fileType: "PDF",
      fileSize: "2.4 MB",
      uploadDate: "Oct 5, 2025"
    },
    {
      id: "2",
      filename: "API_Integration_Guide.pdf",
      fileType: "PDF",
      fileSize: "1.8 MB",
      uploadDate: "Oct 3, 2025"
    },
    {
      id: "3",
      filename: "Admin_Dashboard_Manual.docx",
      fileType: "DOCX",
      fileSize: "856 KB",
      uploadDate: "Sep 28, 2025"
    }
  ]

  return (
    <DocumentSidebar
      documents={mockDocuments}
      onUploadClick={() => console.log('Upload clicked')}
    />
  )
}
