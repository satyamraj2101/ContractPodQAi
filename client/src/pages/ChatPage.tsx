import { useState, useEffect, useRef } from "react";
import { Bot, Menu, Trash2, Loader2, MessageSquare, Upload, X } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, User, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Feedback dialog state
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWaitingForResponse]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (question: string) => {
      setIsWaitingForResponse(true);
      const res = await apiRequest("POST", "/api/chat/message", { 
        question,
        conversationId: selectedConversationId 
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      setIsWaitingForResponse(false);
      
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
      setIsWaitingForResponse(false);
      
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

  // Feedback submission mutation
  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("feedbackText", feedbackText);
      if (feedbackFile) {
        formData.append("attachment", feedbackFile);
      }
      
      const res = await fetch("/api/feedback-submission", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to submit feedback");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it shortly.",
      });
      setIsFeedbackDialogOpen(false);
      setFeedbackText("");
      setFeedbackFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please enter your feedback before submitting.",
        variant: "destructive",
      });
      return;
    }
    feedbackMutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      setFeedbackFile(file);
    }
  };

  const handleRemoveFile = () => {
    setFeedbackFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCloseFeedbackDialog = (open: boolean) => {
    setIsFeedbackDialogOpen(open);
    if (!open) {
      // Clear form when closing dialog
      setFeedbackText("");
      setFeedbackFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setMessages([]);
    setHasManuallySelectedNew(true);
    // Close sidebar on mobile after creating new conversation
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
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

  const handleClearChat = async () => {
    if (!selectedConversationId) return;
    
    try {
      await apiRequest("DELETE", `/api/conversations/${selectedConversationId}`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(null);
      setMessages([]);
      setHasManuallySelectedNew(true);
      toast({
        title: "Chat cleared",
        description: "The conversation has been cleared successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear chat.",
        variant: "destructive",
      });
    }
  };

  const isAdmin = (user as any)?.isAdmin || false;
  const userInitials = (user as any)?.firstName && (user as any)?.lastName 
    ? `${(user as any).firstName[0]}${(user as any).lastName[0]}`.toUpperCase()
    : (user as any)?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
          data-testid="sidebar-overlay"
        />
      )}
      
      {/* Conversation Sidebar - Always visible on desktop, toggleable on mobile */}
      <div className={`
        fixed md:relative z-50 md:z-0 h-full w-80
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
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
      
      <div className="flex-1 flex flex-col w-full">
        {/* Enhanced Header with gradient and better spacing */}
        <header className="h-20 border-b border-border bg-gradient-to-r from-background via-background to-primary/5 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              data-testid="button-toggle-sidebar"
              className="md:hidden hover-elevate active-elevate-2"
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
            {selectedConversationId && messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-clear-chat" title="Clear chat">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all messages in this conversation. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearChat} data-testid="confirm-clear-chat">
                      Clear Chat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
                <DropdownMenuItem onClick={() => setIsFeedbackDialogOpen(true)} data-testid="button-feedback">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Feedback
                </DropdownMenuItem>
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
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <ChatMessage {...message} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Loading indicator when waiting for AI response */}
                {isWaitingForResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-6 bg-muted/50 rounded-xl border border-border"
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">AI is thinking...</p>
                  </motion.div>
                )}
                
                {/* Invisible div for auto-scroll */}
                <div ref={messagesEndRef} />
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
      
      {/* Feedback Dialog */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={handleCloseFeedbackDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Share your thoughts, report issues, or suggest improvements. You can optionally attach screenshots or documents.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-text">Your Feedback</Label>
              <Textarea
                id="feedback-text"
                data-testid="textarea-feedback"
                placeholder="Tell us about your experience, report a bug, or suggest a feature..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-32 resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="feedback-file">Attachment (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id="feedback-file"
                  data-testid="input-feedback-file"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('feedback-file')?.click()}
                  data-testid="button-attach-file"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {feedbackFile ? feedbackFile.name : "Choose File"}
                </Button>
                {feedbackFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    data-testid="button-remove-file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Max file size: 10MB. Supported formats: Images, PDF, Word, Text
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCloseFeedbackDialog(false)}
              data-testid="button-cancel-feedback"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={feedbackMutation.isPending}
              data-testid="button-submit-feedback"
            >
              {feedbackMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
