import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, TestTube } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  // Fetch user settings with real backend
  const { data: userSettings, isLoading } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        return data || null;
      } catch (e) {
        // Fallback to local settings if table doesn't exist or any DB error occurs
        const local = typeof window !== 'undefined' ? localStorage.getItem('user_settings') : null;
        if (local) return JSON.parse(local);
        return {
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          notifications_enabled: true,
          email_notifications: true,
          auto_save: true
        };
      }
    },
    enabled: !!user,
  });

  const { setTheme } = useTheme();

  const [form, setForm] = useState({
    theme: userSettings?.theme || 'system',
    language: userSettings?.language || 'en',
    timezone: userSettings?.timezone || 'UTC',
    notifications_enabled: userSettings?.notifications_enabled ?? true,
    email_notifications: userSettings?.email_notifications ?? true,
    auto_save: userSettings?.auto_save ?? true,
  });

  useEffect(() => {
    if (userSettings) {
      setForm({
        theme: userSettings.theme || 'system',
        language: userSettings.language || 'en',
        timezone: userSettings.timezone || 'UTC',
        notifications_enabled: userSettings.notifications_enabled ?? true,
        email_notifications: userSettings.email_notifications ?? true,
        auto_save: userSettings.auto_save ?? true,
      });
    }
  }, [userSettings]);

  // Update settings mutation  
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      if (!user) throw new Error('No user');
      // Always persist locally first
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_settings', JSON.stringify(settings));
      }
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            ...settings
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (e) {
        // Swallow DB errors to avoid breaking settings UI
        console.warn('Settings upsert failed, saved locally instead', e);
        return settings;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={form.theme} onValueChange={(v) => {
                  const next = { ...form, theme: v };
                  setForm(next);
                  setTheme(v as any); // apply immediately
                  updateSettingsMutation.mutate(next); // auto-save
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('language')}</Label>
                <div className="flex items-center gap-4">
                  <Select value={form.language} onValueChange={(v) => {
                    const next = { ...form, language: v };
                    setForm(next);
                    i18n.changeLanguage(v); // apply immediately
                    updateSettingsMutation.mutate(next); // auto-save
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('english')}</SelectItem>
                      <SelectItem value="de">{t('german')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <LanguageToggle variant="mini" />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive app notifications</p>
                </div>
                <Switch checked={form.notifications_enabled} onCheckedChange={(v) => {
                  const next = { ...form, notifications_enabled: v };
                  setForm(next);
                  updateSettingsMutation.mutate(next); // auto-save
                }} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email updates</p>
                </div>
                <Switch checked={form.email_notifications} onCheckedChange={(v) => {
                  const next = { ...form, email_notifications: v };
                  setForm(next);
                  updateSettingsMutation.mutate(next); // auto-save
                }} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Save</Label>
                  <p className="text-sm text-muted-foreground">Automatically save work</p>
                </div>
                <Switch checked={form.auto_save} onCheckedChange={(v) => {
                  const next = { ...form, auto_save: v };
                  setForm(next);
                  updateSettingsMutation.mutate(next); // auto-save
                }} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => {
                updateSettingsMutation.mutate(form);
                setTheme(form.theme as any);
              }}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
              
              <Button 
                variant="outline"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('test-keys');
                    if (error) throw error;
                    
                    toast({
                      title: "API Keys Test",
                      description: `OpenAI: ${data.results.openai.status}, Replicate: ${data.results.replicate.status}`,
                    });
                  } catch (error: any) {
                    toast({
                      title: "Test Failed",
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                }}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test API Keys
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}