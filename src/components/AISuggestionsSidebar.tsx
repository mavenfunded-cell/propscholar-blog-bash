import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminNavigation } from "@/hooks/useAdminSubdomain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Bot, 
  Copy, 
  RefreshCw, 
  Sparkles, 
  MessageSquare, 
  BookOpen,
  Zap,
  Heart,
  FileText,
  Settings,
  Brain,
  ExternalLink
} from "lucide-react";

interface Message {
  id: string;
  body: string;
  sender_type: string;
  created_at: string;
}

interface Suggestion {
  type: string;
  content: string;
}

interface AISuggestionsSidebarProps {
  ticketId: string;
  messages: Message[];
  onInsertReply: (content: string) => void;
}

const AISuggestionsSidebar = ({ ticketId, messages, onInsertReply }: AISuggestionsSidebarProps) => {
  const { adminNavigate } = useAdminNavigation();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestsRemaining, setRequestsRemaining] = useState<number | null>(null);
  const [requestsPerHour, setRequestsPerHour] = useState<number>(10);

  // Fetch canned messages
  const { data: cannedMessages, isLoading: loadingCanned } = useQuery({
    queryKey: ["canned-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canned_messages")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch knowledge base
  const { data: knowledgeBase, refetch: refetchKnowledge } = useQuery({
    queryKey: ["ai-knowledge-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_knowledge_base")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get current user for rate limiting
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const generateSuggestions = async () => {
    if (!currentUser?.id) {
      toast.error("Please log in to generate suggestions");
      return;
    }

    if (requestsRemaining !== null && requestsRemaining <= 0) {
      toast.error("Rate limit reached. Please wait before refreshing.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-ticket-reply", {
        body: { 
          ticketId, 
          conversationHistory: messages.map(m => ({
            sender_type: m.sender_type,
            body: m.body
          })),
          adminId: currentUser.id
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
        if (data.requests_remaining !== undefined) {
          setRequestsRemaining(data.requests_remaining);
        }
        return;
      }

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        toast.success("AI suggestions generated!");
      }

      if (data?.requests_remaining !== undefined) {
        setRequestsRemaining(data.requests_remaining);
      }
      if (data?.requests_per_hour !== undefined) {
        setRequestsPerHour(data.requests_per_hour);
      }
    } catch (error: any) {
      console.error("Error generating suggestions:", error);
      toast.error(error.message || "Failed to generate suggestions");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const insertReply = (content: string) => {
    onInsertReply(content);
    toast.success("Inserted into reply box!");
  };

  const learnFromConversation = async () => {
    const lastUserMessage = [...messages].reverse().find(m => m.sender_type === "user");
    const lastSupportMessage = [...messages].reverse().find(m => m.sender_type === "support" || m.sender_type === "admin");

    if (!lastUserMessage || !lastSupportMessage) {
      toast.error("Need both customer and support messages to learn from");
      return;
    }

    try {
      const { error } = await supabase
        .from("ai_knowledge_base")
        .insert({
          title: `Conversation Pattern - ${new Date().toLocaleDateString()}`,
          content: `Customer asked: "${lastUserMessage.body.substring(0, 200)}..." \nGood response: "${lastSupportMessage.body.substring(0, 300)}..."`,
          category: "learned",
          source: "conversation"
        });

      if (error) throw error;
      refetchKnowledge();
      toast.success("AI learned from this conversation!");
    } catch (error: any) {
      console.error("Error learning from conversation:", error);
      toast.error("Failed to save learning");
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "quick": return <Zap className="h-4 w-4 text-yellow-500" />;
      case "detailed": return <FileText className="h-4 w-4 text-blue-500" />;
      case "empathetic": return <Heart className="h-4 w-4 text-pink-500" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Removed auto-generation - AI suggestions now only trigger on button click

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col h-full">
      <Tabs defaultValue="ai" className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 m-2">
          <TabsTrigger value="ai" className="text-xs">
            <Bot className="h-3 w-3 mr-1" />
            AI
          </TabsTrigger>
          <TabsTrigger value="canned" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            Canned
          </TabsTrigger>
          <TabsTrigger value="learn" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Learn
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="ai" className="m-0 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Suggestions
              </h3>
              <Button 
                size="sm" 
                variant="default" 
                onClick={generateSuggestions}
                disabled={isGenerating || (requestsRemaining !== null && requestsRemaining <= 0)}
              >
                <Sparkles className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-pulse' : ''}`} />
                {isGenerating ? "Generating..." : suggestions.length > 0 ? "Refresh" : "Get AI Suggestions"}
              </Button>
            </div>

            {/* Rate Limit Status */}
            {requestsRemaining !== null && (
              <div className={`text-xs px-2 py-1 rounded flex items-center justify-between ${
                requestsRemaining > 3 
                  ? 'bg-green-500/10 text-green-400' 
                  : requestsRemaining > 0 
                    ? 'bg-yellow-500/10 text-yellow-400' 
                    : 'bg-red-500/10 text-red-400'
              }`}>
                <span>Requests: {requestsRemaining}/{requestsPerHour}</span>
                <span className="text-muted-foreground">per hour</span>
              </div>
            )}

            {suggestions.length === 0 && !isGenerating && (
              <Card className="border-dashed border-primary/30 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-primary/60" />
                  <p className="text-sm text-muted-foreground">
                    Click "Get AI Suggestions" to generate reply recommendations
                  </p>
                </CardContent>
              </Card>
            )}

            {isGenerating && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-primary animate-pulse" />
                  <p className="text-sm text-muted-foreground">Analyzing conversation...</p>
                </CardContent>
              </Card>
            )}

            {suggestions.map((suggestion, index) => (
              <Card key={index} className="group hover:border-primary/50 transition-colors">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    {getSuggestionIcon(suggestion.type)}
                    <span className="capitalize">{suggestion.type}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-4">
                    {suggestion.content}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => copyToClipboard(suggestion.content)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => insertReply(suggestion.content)}
                    >
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="canned" className="m-0 p-3 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Canned Responses
            </h3>

            {loadingCanned ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-2">
                {cannedMessages?.map((msg) => (
                  <Card key={msg.id} className="group hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-medium text-sm">{msg.title}</span>
                        <Badge variant="secondary" className="text-xs">
                          {msg.shortcut}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {msg.content}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 h-7 text-xs"
                          onClick={() => copyToClipboard(msg.content)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 h-7 text-xs"
                          onClick={() => insertReply(msg.content)}
                        >
                          Use
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="learn" className="m-0 p-3 space-y-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                Train AI
              </h3>

              <Button 
                variant="outline" 
                className="w-full mb-4"
                onClick={learnFromConversation}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Learn from this conversation
              </Button>

              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => adminNavigate("/ai-knowledge")}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Manage AI Knowledge
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => adminNavigate("/canned-messages")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Canned Messages
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                Knowledge Base ({knowledgeBase?.length || 0} entries)
              </h4>
              <div className="space-y-2">
                {knowledgeBase?.slice(0, 5).map((kb) => (
                  <div key={kb.id} className="p-2 bg-muted/50 rounded text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{kb.title}</span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {kb.source}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{kb.content}</p>
                  </div>
                ))}
                {(!knowledgeBase || knowledgeBase.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No knowledge entries yet
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default AISuggestionsSidebar;
