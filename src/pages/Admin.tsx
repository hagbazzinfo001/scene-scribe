import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Database, 
  Activity, 
  Key, 
  Server,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Save,
  Wallet,
  Plus,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function Admin() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('100');

  // Check if user has admin role from database
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userRoles?.some((r) => r.role === "admin") ?? false;

  // Fetch real data - ALL hooks must be called before any conditional returns
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersResult, projectsResult, jobsResult, assetsResult] = await Promise.allSettled([
        supabase.from('profiles').select('id, email, full_name, credits_remaining, credits_used, created_at, account_tier').order('created_at', { ascending: false }),
        supabase.from('projects').select('id, created_at, name').order('created_at', { ascending: false }),
        supabase.from('jobs').select('id, status, type, created_at').order('created_at', { ascending: false }),
        supabase.from('user_assets').select('id, file_type, file_size, created_at').order('created_at', { ascending: false })
      ]);

      return {
        users: usersResult.status === 'fulfilled' ? usersResult.value.data || [] : [],
        projects: projectsResult.status === 'fulfilled' ? projectsResult.value.data || [] : [],
        jobs: jobsResult.status === 'fulfilled' ? jobsResult.value.data || [] : [],
        assets: assetsResult.status === 'fulfilled' ? assetsResult.value.data || [] : []
      };
    },
    enabled: isAdmin, // Only fetch when user is admin
    refetchInterval: 30000
  });

  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('test-keys');
        if (error) throw error;
        return data.results;
      } catch (error) {
        return {
          openai: { status: 'error', message: 'Connection failed' },
          replicate: { status: 'error', message: 'Connection failed' }
        };
      }
    },
    enabled: isAdmin,
    refetchInterval: 60000
  });

  // System maintenance actions
  const clearFailedJobsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('status', 'failed');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Failed jobs cleared successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to clear jobs: ${error.message}`);
    }
  });

  const restartPendingJobsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('status', 'running')
        .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Stuck jobs restarted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to restart jobs: ${error.message}`);
    }
  });

  // Credit management mutations
  const addCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      const { data, error } = await supabase.functions.invoke('manage-credits', {
        body: { action: 'add', userId, amount }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Credits added successfully');
      setCreditAmount('100');
      setSelectedUserId('');
    },
    onError: (error: any) => {
      toast.error(`Failed to add credits: ${error.message}`);
    }
  });

  const deductCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      const { data, error } = await supabase.functions.invoke('manage-credits', {
        body: { action: 'deduct', userId, amount }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Credits deducted successfully');
      setCreditAmount('100');
      setSelectedUserId('');
    },
    onError: (error: any) => {
      toast.error(`Failed to deduct credits: ${error.message}`);
    }
  });

  // Helper function - can be defined anywhere
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'done':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // NOW we can have conditional returns - all hooks are above
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-[400px]">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('sign_in_to_access')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (rolesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-[400px]">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('verifying_permissions')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-[400px]">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('access_denied')}</h3>
            <p className="text-muted-foreground">
              {t('no_admin_permission')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">{t('admin_dashboard')}</h2>
        <p className="text-muted-foreground">
          {t('realtime_monitoring')}
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">{t('users')}</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.users.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.users.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.projects.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.projects.filter(p => new Date(p.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Jobs</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.jobs.filter(j => j.status === 'running' || j.status === 'pending').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.jobs.filter(j => j.status === 'done').length || 0} completed today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((stats?.assets.reduce((acc, asset) => acc + (asset.file_size || 0), 0) || 0) / 1024 / 1024)} MB
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.assets.length || 0} assets
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.jobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{job.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <span className="text-sm">OpenAI API</span>
                    </div>
                    {systemHealth?.openai?.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <span className="text-sm">Replicate API</span>
                    </div>
                    {systemHealth?.replicate?.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.users.slice(0, 10).map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="text-sm font-medium">{user.email || user.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(user.created_at).toLocaleDateString()} • Credits: {user.credits_remaining || 0}
                      </p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Tier Management</CardTitle>
              <p className="text-sm text-muted-foreground">Upgrade or downgrade user account tiers</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-muted">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{stats?.users.filter((u: any) => !u.account_tier || u.account_tier === 'free').length || 0}</div>
                    <p className="text-sm text-muted-foreground">Free</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-500/30">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats?.users.filter((u: any) => u.account_tier === 'pro').length || 0}</div>
                    <p className="text-sm text-muted-foreground">Pro</p>
                  </CardContent>
                </Card>
                <Card className="border-primary/30">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-primary">{stats?.users.filter((u: any) => u.account_tier === 'studio').length || 0}</div>
                    <p className="text-sm text-muted-foreground">Studio</p>
                  </CardContent>
                </Card>
                <Card className="border-purple-500/30">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats?.users.filter((u: any) => u.account_tier === 'enterprise').length || 0}</div>
                    <p className="text-sm text-muted-foreground">Enterprise</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {stats?.users.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div>
                      <p className="font-medium">{user.email || user.full_name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={user.account_tier || 'free'}
                        onValueChange={async (newTier) => {
                          try {
                            const { error } = await supabase
                              .from('profiles')
                              .update({ account_tier: newTier })
                              .eq('id', user.id);
                            if (error) throw error;
                            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                            toast.success(`Updated ${user.email} to ${newTier} tier`);
                          } catch (err: any) {
                            toast.error(`Failed to update tier: ${err.message}`);
                          }
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge className={
                        user.account_tier === 'enterprise' ? 'bg-purple-600 text-white' :
                        user.account_tier === 'studio' ? 'bg-primary text-primary-foreground' :
                        user.account_tier === 'pro' ? 'bg-blue-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }>
                        {user.account_tier || 'free'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credits Issued</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.users.reduce((acc: number, u: any) => acc + (u.credits_remaining || 0) + (u.credits_used || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {stats?.users.length || 0} users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.users.reduce((acc: number, u: any) => acc + (u.credits_used || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Platform-wide usage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.users.reduce((acc: number, u: any) => acc + (u.credits_remaining || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available for use
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Credit Management</CardTitle>
              <p className="text-sm text-muted-foreground">Add or deduct credits for users</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stats?.users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email || user.full_name || user.id.slice(0, 8)} • {user.credits_remaining || 0} credits
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Credit Amount</Label>
                  <Input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!selectedUserId || !creditAmount) {
                      toast.error('Please select a user and enter an amount');
                      return;
                    }
                    addCreditsMutation.mutate({
                      userId: selectedUserId,
                      amount: parseInt(creditAmount)
                    });
                  }}
                  disabled={addCreditsMutation.isPending || !selectedUserId || !creditAmount}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credits
                </Button>

                <Button
                  onClick={() => {
                    if (!selectedUserId || !creditAmount) {
                      toast.error('Please select a user and enter an amount');
                      return;
                    }
                    deductCreditsMutation.mutate({
                      userId: selectedUserId,
                      amount: parseInt(creditAmount)
                    });
                  }}
                  disabled={deductCreditsMutation.isPending || !selectedUserId || !creditAmount}
                  variant="destructive"
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Deduct Credits
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Credit Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.users.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.email || user.full_name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">
                        Used: {user.credits_used || 0} credits
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        (user.credits_remaining || 0) > 100 ? 'bg-green-100 text-green-800' :
                        (user.credits_remaining || 0) > 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {user.credits_remaining || 0} remaining
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Queue Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats?.jobs.filter(j => j.status === 'pending').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats?.jobs.filter(j => j.status === 'running').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Running</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {stats?.jobs.filter(j => j.status === 'failed').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">API Keys Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">OpenAI</span>
                        <Badge className={getStatusColor(systemHealth?.openai?.status || 'error')}>
                          {systemHealth?.openai?.status || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Replicate</span>
                        <Badge className={getStatusColor(systemHealth?.replicate?.status || 'error')}>
                          {systemHealth?.replicate?.status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={() => clearFailedJobsMutation.mutate()}
                    disabled={clearFailedJobsMutation.isPending}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Failed Jobs
                  </Button>
                  <Button 
                    onClick={() => restartPendingJobsMutation.mutate()}
                    disabled={restartPendingJobsMutation.isPending}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restart Stuck Jobs
                  </Button>
                  <Button 
                    onClick={() => queryClient.invalidateQueries()}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}