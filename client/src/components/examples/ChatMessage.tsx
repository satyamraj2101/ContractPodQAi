import { ChatMessage } from '../ChatMessage'

export default function ChatMessageExample() {
  return (
    <div className="space-y-4 p-6">
      <ChatMessage
        role="user"
        content="How do I create a new contract template in ContractPodAI?"
        timestamp="2:34 PM"
      />
      <ChatMessage
        role="assistant"
        content="To create a new contract template in ContractPodAI, follow these steps:

1. Navigate to the **Templates** section in the main menu
2. Click on **Create New Template** button
3. Choose your template type (MSA, NDA, Service Agreement, etc.)
4. Use the template editor to add clauses and variables

You can customize the template with dynamic fields and approval workflows."
        sources={[
          {
            id: "1",
            filename: "ContractPodAI_User_Guide.pdf",
            page: 24,
            url: "#"
          },
          {
            id: "2",
            filename: "Template_Management_Overview.pdf",
            page: 5,
            url: "#"
          }
        ]}
        timestamp="2:34 PM"
      />
    </div>
  )
}
