import { FileText, ExternalLink, User, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

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
}

export function ChatMessage({ role, content, sources, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
        </div>
      )}
      
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-3xl`}>
        <div className="text-xs text-muted-foreground mb-2">{timestamp}</div>
        
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary/15 text-foreground"
              : "bg-card border border-card-border"
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

        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {sources.map((source) => (
              <Badge
                key={source.id}
                variant="outline"
                className="cursor-pointer hover-elevate active-elevate-2"
                onClick={() => window.open(source.url, '_blank')}
                data-testid={`citation-${source.id}`}
              >
                <FileText className="w-3 h-3 mr-1.5" />
                <span className="truncate max-w-[200px]">{source.filename}</span>
                {source.page && <span className="text-muted-foreground ml-1">(p.{source.page})</span>}
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
