import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ChatMessage {
  id: string;
  message: string;
  is_ai_response: boolean;
  created_at: string;
  user_id: string;
}

interface ChatAssistantProps {
  projectId: string;
}

export function ChatAssistant({ projectId }: ChatAssistantProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch chat messages
  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ChatMessage[];
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      // Save user message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert([
          {
            project_id: projectId,
            user_id: user!.id,
            message: userMessage,
            is_ai_response: false,
          }
        ]);

      if (messageError) throw messageError;

      // Call AI assistant function
      const { data: aiResponse, error: aiError } = await supabase.functions
        .invoke('ai-assistant', {
          body: {
            message: userMessage,
            projectId: projectId,
          }
        });

      if (aiError) throw aiError;

      // Save AI response
      const { error: aiMessageError } = await supabase
        .from('chat_messages')
        .insert([
          {
            project_id: projectId,
            user_id: user!.id,
            message: aiResponse.response,
            is_ai_response: true,
          }
        ]);

      if (aiMessageError) throw aiMessageError;

      return aiResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', projectId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    try {
      await sendMessageMutation.mutateAsync(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-4">
                  Your Nollywood AI Assistant for complete pre-production support!
                </p>
                <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-2 text-left">
                  <div><strong>🎬 Script Analysis:</strong> Scene breakdown, character analysis, dialogue review</div>
                  <div><strong>📋 Props & Costumes:</strong> Detailed prop lists, costume requirements, makeup notes</div>
                  <div><strong>📍 Locations:</strong> Scene locations, set requirements, logistics planning</div>
                  <div><strong>📅 Scheduling:</strong> Shooting schedules, call sheets, timeline optimization</div>
                  <div><strong>👥 Cast Management:</strong> Character casting, extras coordination, talent scheduling</div>
                  <div><strong>💰 Budget Planning:</strong> Cost breakdowns, resource allocation, vendor recommendations</div>
                  <div><strong>🎞️ Post-Production:</strong> Editing workflows, VFX planning, audio requirements</div>
                </div>
                <div className="mt-4 text-xs space-y-1">
                  <p className="font-medium">Try asking:</p>
                  <p>"Generate a shooting schedule for all market scenes"</p>
                  <p>"List all props needed for Scene 5"</p>
                  <p>"What are the costume requirements for the main characters?"</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.is_ai_response ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {msg.is_ai_response && (
                    <Bot className="h-6 w-6 text-primary shrink-0 mt-1" />
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 text-sm ${
                      msg.is_ai_response
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  {!msg.is_ai_response && (
                    <User className="h-6 w-6 text-muted-foreground shrink-0 mt-1" />
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Bot className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about script breakdown, scheduling..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || !message.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}