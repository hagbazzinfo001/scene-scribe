import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Film, KeyRound, CheckCircle } from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';

export default function ResetPassword() {
  const { user, updatePassword, loading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated (user must click the reset link which logs them in temporarily)
  useEffect(() => {
    if (!loading && !user) {
      // Give a moment for the auth state to settle after clicking the reset link
      const timer = setTimeout(() => {
        if (!user) {
          navigate('/auth');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('passwords_do_not_match') || 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError(t('password_too_short') || 'Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (!updateError) {
      setIsSuccess(true);
      // Redirect to dashboard after success
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('password_updated') || 'Password Updated!'}</h3>
              <p className="text-muted-foreground">
                {t('redirecting_to_dashboard') || 'Redirecting to dashboard...'}
              </p>
            </CardContent>
          </Card>
        </div>
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
            {t('reset_password_title') || 'Set your new password'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-2">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl text-center">{t('reset_password') || 'Reset Password'}</CardTitle>
            <CardDescription className="text-center">
              {t('enter_new_password') || 'Enter your new password below'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('new_password') || 'New Password'}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder={t('enter_new_password') || 'Enter new password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('confirm_password') || 'Confirm Password'}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder={t('confirm_new_password') || 'Confirm new password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (t('updating_password') || 'Updating...') : (t('update_password') || 'Update Password')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
