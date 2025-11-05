import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Film, Sparkles, CheckCircle2 } from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Waitlist() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const fullName = formData.get('fullName') as string;
    const interest = formData.get('interest') as string;
    
    try {
      // Store waitlist submission
      const { error } = await supabase
        .from('waitlist')
        .insert([
          {
            email,
            full_name: fullName,
            interest_area: interest,
          }
        ]);

      if (error) {
        // If duplicate email, still show success
        if (error.code === '23505') {
          toast({
            title: t('already_on_waitlist') || "You're already on our waitlist!",
            description: t('check_email') || "Check your email for updates.",
          });
          setJoined(true);
        } else {
          throw error;
        }
      } else {
        toast({
          title: t('welcome_to_waitlist') || "Welcome to the waitlist!",
          description: t('chatbot_access_granted') || "You now have access to our AI chatbot.",
        });
        setJoined(true);
      }
    } catch (error: any) {
      toast({
        title: t('error') || "Error",
        description: error.message || t('try_again') || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <Card className="border-primary/20">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t('youre_in') || "You're In!"}</h2>
              <p className="text-muted-foreground mb-6">
                {t('waitlist_success_message') || "Thank you for joining our waitlist! As a thank you, you now have access to our AI chatbot to explore what NollyAI Studio can do."}
              </p>
              <div className="space-y-3">
                <Button 
                  className="w-full gap-2"
                  onClick={() => navigate('/ai-chat')}
                >
                  <Sparkles className="h-4 w-4" />
                  {t('try_ai_chatbot') || "Try AI Chatbot Now"}
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  {t('back_to_home') || "Back to Home"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <LanguageToggle variant="mini" />
        </div>
        
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Film className="h-10 w-10 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground">{t('nollyai_studio')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('join_revolution') || "Join the revolution in African film production"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('join_waitlist')}</CardTitle>
            <CardDescription>
              {t('waitlist_description') || "Be among the first to access our AI-powered film production tools. Plus, get instant access to our AI chatbot!"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('full_name')}</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder={t('enter_full_name')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('enter_email')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest">{t('primary_interest') || "Primary Interest"}</Label>
                <Input
                  id="interest"
                  name="interest"
                  type="text"
                  placeholder={t('eg_script_breakdown') || "e.g., Script Breakdown, VFX, etc."}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>{t('joining') || "Joining..."}</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t('join_waitlist')}
                  </>
                )}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('instant_benefit') || "Instant Benefit"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('chatbot_benefit') || "Get immediate access to our AI chatbot to explore features, ask questions, and see what NollyAI Studio can do for your production."}
              </p>
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {t('already_have_account') || "Already have an account?"}{' '}
              <a href="/auth" className="text-primary hover:underline">
                {t('sign_in')}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
