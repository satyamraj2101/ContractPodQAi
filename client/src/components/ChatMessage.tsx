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

        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-4">
            {sources.map((source) => (
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
