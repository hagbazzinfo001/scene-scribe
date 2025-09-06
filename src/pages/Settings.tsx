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
import { Save } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user settings with real backend
  const { data: userSettings, isLoading } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data || {
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
        notifications_enabled: true,
        email_notifications: true,
        auto_save: true
      };
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
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
                <Select value={form.theme} onValueChange={(v) => setForm({ ...form, theme: v })}>
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
                <Label>Language</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive app notifications</p>
                </div>
                <Switch checked={form.notifications_enabled} onCheckedChange={(v) => setForm({ ...form, notifications_enabled: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email updates</p>
                </div>
                <Switch checked={form.email_notifications} onCheckedChange={(v) => setForm({ ...form, email_notifications: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Save</Label>
                  <p className="text-sm text-muted-foreground">Automatically save work</p>
                </div>
                <Switch checked={form.auto_save} onCheckedChange={(v) => setForm({ ...form, auto_save: v })} />
              </div>
            </div>

            <Button onClick={() => {
              updateSettingsMutation.mutate(form);
              setTheme(form.theme as any);
            }}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}