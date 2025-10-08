import { MessageSquare, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "chat" | "documents";
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === "chat") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 shadow-xl shadow-primary/10">
          <MessageSquare className="w-14 h-14 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold mb-3">Start a Conversation</h3>
        <p className="text-muted-foreground max-w-lg text-base leading-relaxed">
          Ask any question about ContractPodAI documentation and get instant, accurate answers with clickable source citations
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 shadow-xl shadow-primary/10">
        <Upload className="w-14 h-14 text-primary" />
      </div>
      <h3 className="text-2xl font-semibold mb-3">No Documents Yet</h3>
      <p className="text-muted-foreground max-w-lg text-base leading-relaxed mb-8">
        Upload your ContractPodAI documentation to start using the AI assistant
      </p>
      <Button onClick={onAction} size="lg" className="shadow-lg shadow-primary/20" data-testid="button-upload-first">
        Upload Documents
      </Button>
    </div>
  );
}
