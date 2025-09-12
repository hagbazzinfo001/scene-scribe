import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Play, Trash2, FileText, Image, Video, Music, Box } from 'lucide-react';
import { toast } from 'sonner';
import { MediaPreview } from '@/components/MediaPreview';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AssetLibraryProps {
  projectId?: string;
}

export function AssetLibrary({ projectId }: AssetLibraryProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['user-assets', projectId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const deleteMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-asset', {
        body: { asset_id: assetId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-assets'] });
      toast.success('Asset deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete asset: ${error.message}`);
    }
  });

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'video': return <Video className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
      case 'image': return <Image className="h-5 w-5" />;
      case 'model': return <Box className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No assets yet</h3>
          <p className="text-muted-foreground">
            Upload files in the other tabs to build your asset library
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Asset Library</h3>
          <p className="text-sm text-muted-foreground">{assets.length} assets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <Card key={asset.id} className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(asset.file_type)}
                  <CardTitle className="text-sm truncate" title={asset.filename}>
                    {asset.filename}
                  </CardTitle>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{asset.filename}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteMutation.mutate(asset.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Preview */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {asset.file_type === 'video' || asset.file_type === 'audio' || asset.file_type === 'image' ? (
                  <MediaPreview url={asset.file_url} type={asset.file_type} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileIcon(asset.file_type)}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className={getStatusColor(asset.processing_status)}>
                    {asset.processing_status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(asset.file_size)}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  <div>Type: {asset.file_type}</div>
                  <div>Created: {new Date(asset.created_at).toLocaleDateString()}</div>
                  {asset.metadata && Object.keys(asset.metadata).length > 0 && (
                    <div className="mt-1 text-xs">
                      {JSON.stringify(asset.metadata).length > 50 
                        ? JSON.stringify(asset.metadata).substring(0, 50) + '...'
                        : JSON.stringify(asset.metadata)
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(asset.file_url, '_blank')}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                {(asset.file_type === 'video' || asset.file_type === 'audio') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}