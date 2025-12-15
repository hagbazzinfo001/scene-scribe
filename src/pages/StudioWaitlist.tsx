import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Film, Sparkles, CheckCircle2, Building2, Crown } from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function StudioWaitlist() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const fullName = formData.get('fullName') as string;
    const companyName = formData.get('companyName') as string;
    const interest = formData.get('interest') as string;
    
    try {
      const { error } = await supabase
        .from('studio_waitlist')
        .insert([{
          email,
          full_name: fullName,
          company_name: companyName,
          interest_area: interest,
        }]);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "You're already on our Studio waitlist!",
            description: "We'll notify you when Studio access becomes available.",
          });
          setJoined(true);
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Welcome to the Studio waitlist!",
          description: "You'll be among the first to access premium features.",
        });
        setJoined(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Please try again later.",
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
              <h2 className="text-2xl font-bold mb-2">You're on the Studio List!</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for your interest in NollyAI Studio. We'll notify you as soon as 
                Studio access becomes available with exclusive features like Motion Generator, 
                Storyboard tools, and more.
              </p>
              <div className="space-y-3">
                <Button 
                  className="w-full gap-2"
                  onClick={() => navigate('/dashboard')}
                >
                  <Sparkles className="h-4 w-4" />
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  Back to Home
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
            <div className="relative">
              <Film className="h-12 w-12 text-primary" />
              <Crown className="h-5 w-5 text-amber-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">NollyAI Studio</h1>
          <p className="text-muted-foreground">
            Premium tools for professional film production
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Join Studio Waitlist</CardTitle>
            <CardDescription>
              Get early access to exclusive features including Motion Generator, 
              Storyboard & Moodboard tools, and advanced VFX capabilities.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company / Studio Name (Optional)</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="Your production company"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest">Primary Interest</Label>
                <Input
                  id="interest"
                  name="interest"
                  type="text"
                  placeholder="e.g., Motion Capture, VFX, Full Production"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>Joining...</>
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    Join Studio Waitlist
                  </>
                )}
              </Button>
            </form>

            <Separator className="my-6" />

            {/* Studio Features Preview */}
            <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Studio Exclusive Features
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  AI Motion Generator (Mocap Data)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Storyboard & Moodboard Tools
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Advanced Roto/Tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Priority Support & Processing
                </li>
              </ul>
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <a href="/auth" className="text-primary hover:underline">
                Sign in
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
