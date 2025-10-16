import { FileText, ExternalLink, User, Bot, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SourceCitation {
  id: string;
  filename: string;
  page?: number;
  url: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  timestamp: string;
  id?: string;
  noRelevantInfo?: boolean;
  onOpenFeedback?: () => void;
}

export function ChatMessage({ role, content, sources, timestamp, id, noRelevantInfo, onOpenFeedback }: ChatMessageProps) {
  const isUser = role === "user";
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deduplicate sources by filename and page
  const uniqueSources = sources ? sources.filter((source, index, self) =>
    index === self.findIndex((s) => 
      s.filename === source.filename && s.page === source.page
    )
  ) : [];

  const handleFeedback = async (isHelpful: boolean) => {
    if (!id || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/feedback", {
        messageId: id,
        isHelpful,
      });
      
      setFeedback(isHelpful ? "helpful" : "not_helpful");
      toast({
        title: "Thanks for your feedback!",
        description: "Your feedback helps us improve.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex gap-5 ${isUser ? "justify-end" : "justify-start"} mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
      )}
      
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-3xl`}>
        <div className="text-xs font-medium text-muted-foreground mb-2.5 px-1">{timestamp}</div>
        
        <div
          className={`rounded-2xl px-5 py-4 transition-all duration-200 ${
            isUser
              ? "bg-gradient-to-br from-primary/15 to-primary/10 text-foreground shadow-sm hover:shadow-md"
              : "bg-card border border-card-border shadow-md hover:shadow-lg"
          }`}
        >
          {isUser ? (
            <p className="text-base leading-relaxed">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {uniqueSources && uniqueSources.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-4">
            {uniqueSources.map((source) => (
              <Badge
                key={source.id}
                variant="outline"
                className="cursor-pointer hover-elevate active-elevate-2 shadow-sm px-3 py-1.5 transition-all duration-200 hover:scale-105"
                onClick={() => window.open(source.url, '_blank')}
                data-testid={`citation-${source.id}`}
              >
                <FileText className="w-3.5 h-3.5 mr-2" />
                <span className="truncate max-w-[200px] font-medium">{source.filename}</span>
                {source.page && <span className="text-muted-foreground ml-1.5">(p.{source.page})</span>}
                <ExternalLink className="w-3 h-3 ml-2" />
              </Badge>
            ))}
          </div>
        )}

        {/* Feedback buttons for assistant messages */}
        {!isUser && id && !noRelevantInfo && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Was this helpful?</span>
            <div className="flex gap-1">
              <Button
                variant={feedback === "helpful" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => handleFeedback(true)}
                disabled={isSubmitting || feedback !== null}
                data-testid="button-feedback-helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={feedback === "not_helpful" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => handleFeedback(false)}
                disabled={isSubmitting || feedback !== null}
                data-testid="button-feedback-not-helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Information not found message with feedback button */}
        {!isUser && noRelevantInfo && onOpenFeedback && (
          <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">
                  Information Not Found
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  I couldn't find relevant information in the available documentation. Please consider submitting feedback to help us improve.
                </p>
                <Button
                  size="sm"
                  variant="default"
                  onClick={onOpenFeedback}
                  data-testid="button-submit-feedback"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Submit Feedback
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-muted to-muted/70 flex items-center justify-center shadow-sm">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
