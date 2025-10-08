import { useState, useEffect } from "react";
import { Bot, Menu } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { EmptyState } from "@/components/EmptyState";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Shield } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

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

interface Document {
  id: string;
  filename: string;
  originalFilename: string;
  fileType: string;
  fileSize: string;
  uploadDate: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [hasManuallySelectedNew, setHasManuallySelectedNew] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('chatSidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('chatSidebarOpen', String(isSidebarOpen));
  }, [isSidebarOpen]);
  
  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };
  
  // Logout handler
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      window.location.href = '/';
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = '/';
    }
  };

  // Load conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    retry: false,
  });

  // Load messages for selected conversation
  const { data: conversationMessages, isLoading: isLoadingMessages } = useQuery<any[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
    retry: false,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/chat/message", { 
        question,
        conversationId: selectedConversationId 
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      // Add both messages to the UI
      const userMsg: Message = {
        id: data.userMessage.id,
        role: "user",
        content: data.userMessage.content,
        timestamp: new Date(data.userMessage.timestamp).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        })
      };
      
      const aiMsg: Message = {
        id: data.assistantMessage.id,
        role: "assistant",
        content: data.assistantMessage.content,
        sources: data.assistantMessage.sources,
        timestamp: new Date(data.assistantMessage.timestamp).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        })
      };
      
      setMessages(prev => [...prev, userMsg, aiMsg]);
      
      // If this was a new conversation (no selectedConversationId), set it
      if (!selectedConversationId && data.conversationId) {
        setSelectedConversationId(data.conversationId);
        setHasManuallySelectedNew(false);
      }
      
      // Invalidate queries to refresh conversations list and messages
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId, "messages"] });
    },
    onError: async (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      
      // Check if it's a Gemini quota error
      const errorMessage = error.message || "";
      if (errorMessage.includes("quota") || errorMessage.includes("429")) {
        toast({
          title: "Gemini API Quota Exceeded",
          description: "Your Gemini API key has run out of quota. Please check your API key at Google AI Studio.",
          variant: "destructive",
          duration: 6000,
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load conversation messages into state
  useEffect(() => {
    if (conversationMessages) {
      const formattedMessages: Message[] = conversationMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        timestamp: new Date(msg.timestamp).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        })
      }));
      setMessages(formattedMessages);
    } else {
      setMessages([]);
    }
  }, [conversationMessages]);

  // Auto-select first conversation on load (but not if user manually clicked "New")
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId && !hasManuallySelectedNew) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId, hasManuallySelectedNew]);

  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setHasManuallySelectedNew(false);
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setMessages([]);
    setHasManuallySelectedNew(true);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/conversations/${id}`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
        setMessages([]);
        setHasManuallySelectedNew(true);
      }
      toast({
        title: "Conversation deleted",
        description: "The conversation has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation.",
        variant: "destructive",
      });
    }
  };

  const isAdmin = (user as any)?.isAdmin || false;
  const userInitials = (user as any)?.firstName && (user as any)?.lastName 
    ? `${(user as any).firstName[0]}${(user as any).lastName[0]}`.toUpperCase()
    : (user as any)?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="flex h-screen bg-background">
      {/* Conversation Sidebar with transition */}
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
        <ConversationSidebar
          conversations={conversations.map(conv => ({
            id: conv.id,
            title: conv.title || "New Conversation",
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            messageCount: conv.messageCount || 0,
          }))}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>
      
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header with gradient and better spacing */}
        <header className="h-20 border-b border-border bg-gradient-to-r from-background via-background to-primary/5 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              data-testid="button-toggle-sidebar"
              className="hover-elevate active-elevate-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-xl">ContractPodAI Assistant</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Documentation Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-6 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="button-user-menu">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={(user as any)?.profileImageUrl || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-3 border-b border-border">
                  <p className="text-sm font-medium">{(user as any)?.firstName} {(user as any)?.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{(user as any)?.email}</p>
                  {isAdmin && (
                    <p className="text-xs text-primary font-medium mt-1">Admin</p>
                  )}
                </div>
                <DropdownMenuItem onClick={() => window.location.href = '/profile'} data-testid="button-profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => window.location.href = '/admin'} data-testid="button-admin">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Enhanced Chat Area with better spacing */}
        <ScrollArea className="flex-1 bg-gradient-to-b from-background to-background/95">
          <div className="max-w-5xl mx-auto px-8 py-12">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-pulse text-muted-foreground">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <EmptyState type="chat" />
            ) : (
              <div className="space-y-8">
                {messages.map((message) => (
                  <ChatMessage key={message.id} {...message} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Enhanced Input with shadow */}
        <div className="border-t border-border shadow-2xl">
          <ChatInput 
            onSendMessage={handleSendMessage} 
            disabled={sendMessageMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
