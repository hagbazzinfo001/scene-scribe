import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface BreakdownRunnerProps {
  projectId?: string;
  onJobCreated?: (jobId: string) => void;
}

export function BreakdownRunner({ projectId, onJobCreated }: BreakdownRunnerProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Fetch available script assets
  const loadAvailableAssets = async () => {
    try {
      const { data: assets } = await supabase
        .from('user_assets')
        .select('*')
        .eq('file_type', 'script')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      setAvailableAssets(assets || []);
      if (assets && assets.length > 0 && !selectedAsset) {
        setSelectedAsset(assets[0].id);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  // Run script breakdown with true background processing
  const runBreakdown = async () => {
    if (!selectedAsset || !user) {
      toast.error(t('select_script'));
      return;
    }

    setIsRunning(true);
    
    try {
      const asset = availableAssets.find(a => a.id === selectedAsset);
      
      // Create job entry first  
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          type: 'script-breakdown',
          status: 'pending',
          input_data: {
            asset_id: asset.id,
            file_url: asset.file_url,
            filename: asset.filename
          }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Start Edge Function processing with proper auth
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      
      if (!authToken) {
        throw new Error('Authentication required for processing');
      }

      // Invoke the function but don't await it - true background processing
      supabase.functions.invoke('script-breakdown-enhanced', {
        body: {
          asset_id: asset.id,
          file_url: asset.file_url,
          filename: asset.filename,
          project_id: projectId || null
        },
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }).then(({ data, error }) => {
        if (error) {
          console.error('Background processing error:', error);
          // Update job status on error
          supabase
            .from('jobs')
            .update({ 
              status: 'failed', 
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);
        }
      }).catch(error => {
        console.error('Function invocation error:', error);
      });

      toast.success(t('breakdown_started'));
      onJobCreated?.(job.id);
      
      // Create persistent polling that survives page navigation
      const pollJobStatus = () => {
        // Use a unique key for this polling session
        const pollKey = `breakdown_poll_${job.id}`;
        
        // Store the job ID in localStorage for cross-tab persistence
        localStorage.setItem(pollKey, JSON.stringify({
          jobId: job.id,
          startTime: Date.now(),
          userId: user.id
        }));
        
        const intervalId = setInterval(async () => {
          try {
            // Check if we should still be polling
            const pollData = localStorage.getItem(pollKey);
            if (!pollData) {
              clearInterval(intervalId);
              return;
            }
            
            const { startTime } = JSON.parse(pollData);
            // Stop polling after 15 minutes
            if (Date.now() - startTime > 15 * 60 * 1000) {
              localStorage.removeItem(pollKey);
              clearInterval(intervalId);
              return;
            }
            
            const { data: jobStatus } = await supabase
              .from('jobs')
              .select('status, output_data, error_message')
              .eq('id', job.id)
              .single();
            
            if (jobStatus?.status === 'done') {
              toast.success(t('breakdown_completed'));
              localStorage.removeItem(pollKey);
              clearInterval(intervalId);
              
              // Refresh any breakdown displays
              window.dispatchEvent(new CustomEvent('breakdown-completed', { 
                detail: { jobId: job.id, output: jobStatus.output_data } 
              }));
            } else if (jobStatus?.status === 'failed') {
              toast.error(`${t('breakdown_failed')}: ${jobStatus.error_message}`);
              localStorage.removeItem(pollKey);
              clearInterval(intervalId);
            }
          } catch (error) {
            console.error('Status polling error:', error);
          }
        }, 3000); // Poll every 3 seconds for better responsiveness
      };
      
      // Start persistent polling
      pollJobStatus();

    } catch (error: any) {
      console.error('Breakdown error:', error);
      toast.error(`${t('breakdown_failed')}: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Load assets when component mounts
  useEffect(() => {
    if (projectId) {
      loadAvailableAssets();
    }
  }, [projectId]);

  // Alternative: load all script assets if no projectId
  useEffect(() => {
    if (!projectId) {
      const loadAllScripts = async () => {
        try {
          const { data: assets } = await supabase
            .from('user_assets')
            .select('*')
            .eq('file_type', 'script')
            .order('created_at', { ascending: false });
          
          setAvailableAssets(assets || []);
          if (assets && assets.length > 0 && !selectedAsset) {
            setSelectedAsset(assets[0].id);
          }
        } catch (error) {
          console.error('Failed to load all script assets:', error);
        }
      };
      loadAllScripts();
    }
  }, [projectId]);

  if (availableAssets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('no_script_files')}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('upload_script_first')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          {t('script_breakdown')} Runner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">{t('available_scripts')}</h4>
          <div className="space-y-2">
            {availableAssets.map((asset) => (
              <div 
                key={asset.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedAsset === asset.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedAsset(asset.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{asset.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded: {new Date(asset.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {Math.round((asset.file_size || 0) / 1024)} KB
                    </Badge>
                    {selectedAsset === asset.id && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={runBreakdown}
          disabled={isRunning || !selectedAsset}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('analyzing_script')}
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              {t('run_script_breakdown')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}