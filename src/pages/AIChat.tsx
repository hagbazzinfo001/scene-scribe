import { Bot, MessageSquare, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatAssistant } from '@/components/ChatAssistant';
import { useTranslation } from 'react-i18next';

export default function AIChat() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto p-6 h-full">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('ai_assistant_chat')}</h1>
            <p className="text-muted-foreground">
              {t('ai_assistant_description')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Info Cards */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                <div>
                  <strong>Script Analysis</strong>
                  <p className="text-muted-foreground">Scene breakdown, character analysis, dialogue review</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                <div>
                  <strong>Production Planning</strong>
                  <p className="text-muted-foreground">Scheduling, budgeting, resource allocation</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                <div>
                  <strong>Asset Management</strong>
                  <p className="text-muted-foreground">Props, costumes, locations, cast management</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                Quick Commands
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="p-2 bg-muted/50 rounded text-xs font-mono">
                "Analyze my script structure"
              </div>
              <div className="p-2 bg-muted/50 rounded text-xs font-mono">
                "Create a shooting schedule"
              </div>
              <div className="p-2 bg-muted/50 rounded text-xs font-mono">
                "List all props needed"
              </div>
              <div className="p-2 bg-muted/50 rounded text-xs font-mono">
                "Budget breakdown for Act 1"
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <ChatAssistant projectId="global" />
        </div>
      </div>
    </div>
  );
}