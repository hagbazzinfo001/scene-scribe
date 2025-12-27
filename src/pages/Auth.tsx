import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { Film, Mail, ArrowLeft } from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';

export default function Auth() {
  const { user, signUp, signIn, signInWithGoogle, resetPassword, loading } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

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

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetEmail) return;
    
    setIsLoading(true);
    const { error } = await resetPassword(resetEmail);
    setIsLoading(false);
    
    if (!error) {
      setResetSent(true);
    }
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
            {showForgotPassword ? (
              // Forgot Password Form
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setResetEmail('');
                  }}
                  className="mb-2 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('back_to_sign_in') || 'Back to Sign In'}
                </Button>
                
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl">{t('forgot_password') || 'Forgot Password'}</CardTitle>
                  <CardDescription>
                    {t('forgot_password_desc') || "Enter your email and we'll send you a reset link"}
                  </CardDescription>
                </CardHeader>

                {resetSent ? (
                  <div className="text-center py-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <p className="text-green-700 dark:text-green-300 font-medium">
                        {t('reset_link_sent') || 'Reset link sent!'}
                      </p>
                      <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                        {t('check_email_for_reset') || 'Check your email for the password reset link.'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetSent(false);
                        setResetEmail('');
                      }}
                    >
                      {t('back_to_sign_in') || 'Back to Sign In'}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">{t('email')}</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder={t('enter_email')}
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (t('sending') || 'Sending...') : (t('send_reset_link') || 'Send Reset Link')}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              // Sign In / Sign Up Tabs
              <>
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
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password">{t('password')}</Label>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="px-0 h-auto font-normal text-muted-foreground hover:text-primary"
                            onClick={() => setShowForgotPassword(true)}
                          >
                            {t('forgot_password') || 'Forgot password?'}
                          </Button>
                        </div>
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
                        <p className="text-xs text-muted-foreground">
                          {t('password_requirements') || 'Password must be at least 6 characters'}
                        </p>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}