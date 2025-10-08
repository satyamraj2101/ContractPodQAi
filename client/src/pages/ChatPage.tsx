import { useState } from "react";
import { Bot } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { DocumentSidebar } from "@/components/DocumentSidebar";
import { UploadDialog } from "@/components/UploadDialog";
import { EmptyState } from "@/components/EmptyState";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    id: string;
    filename: string;
    page?: number;
    url: string;
  }>;
  timestamp: string;
}

export default function ChatPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  // todo: remove mock functionality
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "user",
      content: "How do I create a new contract template in ContractPodAI?",
      timestamp: "2:34 PM"
    },
    {
      id: "2",
      role: "assistant",
      content: `To create a new contract template in ContractPodAI, follow these steps:

1. Navigate to the **Templates** section in the main menu
2. Click on **Create New Template** button
3. Choose your template type (MSA, NDA, Service Agreement, etc.)
4. Use the template editor to add clauses and variables

You can customize the template with dynamic fields and approval workflows.`,
      sources: [
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
      ],
      timestamp: "2:34 PM"
    },
    {
      id: "3",
      role: "user",
      content: "What are the different approval workflow types available?",
      timestamp: "2:36 PM"
    },
    {
      id: "4",
      role: "assistant",
      content: `ContractPodAI supports three main approval workflow types:

**1. Sequential Approval**
- Requests go through approvers one by one in order
- Each approver must complete their review before the next

**2. Parallel Approval**
- All approvers receive the request simultaneously
- Approval completes when all approvers have reviewed

**3. Dynamic Approval**
- Routing changes based on contract attributes
- Conditional logic determines the approval path

You can configure these workflows in the Admin settings under Workflow Configuration.`,
      sources: [
        {
          id: "3",
          filename: "Workflow_Configuration_Guide.pdf",
          page: 12,
          url: "#"
        }
      ],
      timestamp: "2:36 PM"
    }
  ]);

  const documents = [
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
    },
    {
      id: "4",
      filename: "Template_Management_Overview.pdf",
      fileType: "PDF",
      fileSize: "1.2 MB",
      uploadDate: "Sep 25, 2025"
    },
    {
      id: "5",
      filename: "Workflow_Configuration_Guide.pdf",
      fileType: "PDF",
      fileSize: "3.1 MB",
      uploadDate: "Sep 20, 2025"
    }
  ];

  const handleSendMessage = (content: string) => {
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
    
    setMessages([...messages, newUserMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "This is a simulated response. In the full application, this will be powered by OpenAI and will provide accurate answers based on your documentation.",
        sources: [
          {
            id: "sim-1",
            filename: "ContractPodAI_User_Guide.pdf",
            page: 10,
            url: "#"
          }
        ],
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="flex h-screen">
      <DocumentSidebar
        documents={documents}
        onUploadClick={() => setUploadDialogOpen(true)}
      />
      
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">ContractPodAI Assistant</h1>
              <p className="text-xs text-muted-foreground">Documentation Q&A</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-user-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary">JD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="button-profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {messages.length === 0 ? (
              <EmptyState type="chat" />
            ) : (
              messages.map((message) => (
                <ChatMessage key={message.id} {...message} />
              ))
            )}
          </div>
        </ScrollArea>

        <ChatInput onSendMessage={handleSendMessage} />
      </div>

      <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    </div>
  );
}
