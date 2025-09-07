import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, FileText, Music, Video, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ImportAssetDropzone } from '@/components/ImportAssetDropzone';

// [SCRIPT_BREAKDOWN] Project-specific import page for organized asset management
export default function ProjectImportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch project details
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch recent imports for this project
  const { data: recentImports = [], refetch: refetchImports } = useQuery({
    queryKey: ['recent-imports', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleAssetUploaded = (assetId: string) => {
    refetchImports();
    toast({
      title: "Asset imported successfully!",
      description: "Your asset has been uploaded and is being analyzed.",
    });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'script': return <FileText className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Analyzed</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(`/project/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Import Assets</h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
        </div>
      </div>

      {/* Import Dropzone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Assets
          </CardTitle>
          <CardDescription>
            Import scripts, audio, video, and images for AI-powered breakdown and analysis.
            Optimized for Pan-African indie studios and low-budget workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportAssetDropzone 
            projectId={projectId!} 
            onAssetUploaded={handleAssetUploaded}
          />
        </CardContent>
      </Card>

      {/* Recent Imports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>
            Track your recently uploaded assets and their analysis status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentImports.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No assets imported yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your first script, audio, or video file to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentImports.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileIcon(asset.file_type)}
                    <div>
                      <p className="font-medium">{asset.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(asset.created_at).toLocaleDateString()} • {asset.file_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(asset.processing_status || 'pending')}
                    {asset.file_url && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(asset.file_url, '_blank')}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common workflows for Nollywood productions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate(`/project/${projectId}?tab=breakdown`)}
            >
              <FileText className="h-6 w-6" />
              Script Breakdown
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/audio-cleanup')}
            >
              <Music className="h-6 w-6" />
              Audio Cleanup
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/vfx-animation')}
            >
              <Video className="h-6 w-6" />
              VFX Tools
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}