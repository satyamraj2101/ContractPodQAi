import { MessageSquare, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "chat" | "documents";
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === "chat") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <MessageSquare className="w-12 h-12 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Ask any question about ContractPodAI documentation and get instant answers with source citations
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Upload className="w-12 h-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No Documents Yet</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Upload your ContractPodAI documentation to start using the AI assistant
      </p>
      <Button onClick={onAction} data-testid="button-upload-first">
        Upload Documents
      </Button>
    </div>
  );
}
