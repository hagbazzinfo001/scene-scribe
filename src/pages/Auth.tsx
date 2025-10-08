import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { Film, Mail } from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';

export default function Auth() {
  const { user, signUp, signIn, signInWithGoogle, loading } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    
    await signUp(email, password, fullName);
    setIsLoading(false);
  };

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    await signIn(email, password);
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signInWithGoogle();
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2"><LanguageToggle variant="mini" /></div>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Film className="h-10 w-10 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground">{t('nollyai_studio')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('film_production_assistant')}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('sign_in')}</TabsTrigger>
                <TabsTrigger value="signup">{t('sign_up')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl">{t('welcome_back')}</CardTitle>
                  <CardDescription>
                    {t('sign_in_to_continue')}
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('email')}</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder={t('enter_email')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('password')}</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder={t('enter_password')}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? t('signing_in') : t('sign_in')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl">{t('create_account')}</CardTitle>
                  <CardDescription>
                    {t('get_started')}
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('full_name')}</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder={t('enter_full_name')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('email')}</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder={t('enter_email')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('password')}</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder={t('create_password')}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? t('creating_account') : t('create_account')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Separator className="my-4" />
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Mail className="mr-2 h-4 w-4" />
                {t('continue_with_google')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}