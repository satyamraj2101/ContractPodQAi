import { useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background p-6 transition-all duration-200">
      <div className="flex gap-3 max-w-5xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about ContractPodAI documentation..."
            className="resize-none min-h-14 max-h-32 pr-14 shadow-sm transition-all duration-200 focus:shadow-md"
            disabled={disabled}
            data-testid="input-chat-message"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-2 bottom-2 opacity-0 pointer-events-none"
            data-testid="button-attach"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={!message.trim() || disabled}
          className="h-14 px-6 shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-105 active:scale-95"
          data-testid="button-send-message"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </form>
  );
}
