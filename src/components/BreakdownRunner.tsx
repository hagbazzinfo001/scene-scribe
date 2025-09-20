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

  // Run script breakdown
  const runBreakdown = async () => {
    if (!selectedAsset || !user) {
      toast.error('Please select a script to analyze');
      return;
    }

    setIsRunning(true);
    try {
      const asset = availableAssets.find(a => a.id === selectedAsset);
      
      // Call the script breakdown function
      const { data, error } = await supabase.functions.invoke('script-breakdown-enhanced', {
        body: {
          asset_id: asset.id,
          file_url: asset.file_url,
          filename: asset.filename,
          project_id: projectId
        }
      });

      if (error) throw error;

      if (data.job_id) {
        toast.success('Script breakdown started successfully!');
        onJobCreated?.(data.job_id);
      }
    } catch (error: any) {
      console.error('Breakdown error:', error);
      toast.error(`Breakdown failed: ${error.message}`);
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

  if (availableAssets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No script files found.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Upload a script file first to run breakdown analysis.
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
          <h4 className="font-medium mb-2">Available Scripts</h4>
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
              Analyzing Script...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Script Breakdown
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}