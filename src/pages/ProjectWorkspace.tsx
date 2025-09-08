import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Upload, FileText, Users, Download, Settings, RefreshCw, Music, Video, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatAssistant } from '@/components/ChatAssistant';
import { UsageAnalytics } from '@/components/UsageAnalytics';
import { ImportAssetDropzone } from '@/components/ImportAssetDropzone';
import { BreakdownResults } from '@/components/BreakdownResults';
import jsPDF from 'jspdf';

export default function ProjectWorkspace() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('assets');

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

  // Fetch user assets for this project
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch jobs for this project
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Real-time subscriptions for job updates
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('project-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_assets',
        filter: `project_id=eq.${projectId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `project_id=eq.${projectId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['jobs', projectId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  const handleAssetUploaded = (asset: any) => {
    queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
    toast({
      title: "Asset uploaded",
      description: `${asset.filename} has been uploaded and is being analyzed.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex-1 flex h-screen">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Project collaboration features will be available soon.",
                  });
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Invite
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast({
                    title: "Coming Soon", 
                    description: "Project settings will be available soon.",
                  });
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="vfx">VFX Tools</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="assets" className="flex-1">
              <div className="space-y-6">
                <ImportAssetDropzone 
                  projectId={projectId!} 
                  onAssetUploaded={handleAssetUploaded}
                />

                {assets.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Project Assets</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => queryClient.invalidateQueries({ queryKey: ['assets', projectId] })}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        All uploaded assets and their processing status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {assets.map((asset: any) => (
                          <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                {asset.file_type === 'script' && <FileText className="h-5 w-5" />}
                                {asset.file_type === 'audio' && <Music className="h-5 w-5" />}
                                {asset.file_type === 'video' && <Video className="h-5 w-5" />}
                                {asset.file_type === 'image' && <Image className="h-5 w-5" />}
                              </div>
                              <div>
                                <p className="font-medium">{asset.filename}</p>
                                <p className="text-sm text-muted-foreground">
                                  {asset.file_type} • {asset.processing_status}
                                  {asset.file_size && ` • ${Math.round(asset.file_size / 1024)} KB`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {asset.processing_status === 'completed' && (
                                <Badge variant="default">Ready</Badge>
                              )}
                              {asset.processing_status === 'processing' && (
                                <Badge variant="secondary">Processing</Badge>
                              )}
                              {asset.processing_status === 'failed' && (
                                <Badge variant="destructive">Failed</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="flex-1">
              <div className="mb-4">
                <Button 
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('trigger-jobs');
                      if (error) throw error;
                      toast({
                        title: "Processing Jobs",
                        description: `Processed ${data.processed} jobs successfully.`,
                      });
                      queryClient.invalidateQueries({ queryKey: ['jobs', projectId] });
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Process Pending Jobs
                </Button>
              </div>
              
              <BreakdownResults 
                jobs={jobs}
                onExport={(job, format) => {
                  if (format === 'csv' && job.output_data?.scenes) {
                    const csvData = [
                      ['Scene', 'Location', 'Description', 'Characters'],
                      ...job.output_data.scenes.map((scene: any) => [
                        scene.id || '',
                        scene.location || '',
                        scene.description || '',
                        (scene.characters || []).join(', ')
                      ])
                    ];
                    
                    const csvContent = csvData.map(row => 
                      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
                    ).join('\n');
                    
                    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `script-breakdown-${Date.now()}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  } else if (format === 'pdf' && job.output_data?.scenes) {
                    const doc = new jsPDF();
                    doc.setFontSize(14);
                    doc.text('Script Breakdown', 14, 20);
                    let y = 30;
                    
                    job.output_data.scenes.slice(0, 50).forEach((scene: any, idx: number) => {
                      const line = `Scene ${scene.id || idx + 1} - ${scene.location || ''}`;
                      doc.setFontSize(12);
                      doc.text(line, 14, y);
                      y += 6;
                      const desc = (scene.description || '').toString();
                      const split = doc.splitTextToSize(desc, 180);
                      split.forEach((row: string) => { doc.text(row, 14, y); y += 6; });
                      y += 4;
                      if (y > 270) { doc.addPage(); y = 20; }
                    });
                    doc.save(`script-breakdown-${Date.now()}.pdf`);
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="vfx" className="flex-1">
              <Card>
                <CardHeader>
                  <CardTitle>VFX & Animation Tools</CardTitle>
                  <CardDescription>
                    AI-powered roto-scoping, auto-rigging, and color processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <iframe 
                    src={`/vfx-animation/${projectId}`} 
                    className="w-full h-[600px] border-0 rounded-lg"
                    title="VFX Tools"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="flex-1">
              <Card>
                <CardHeader>
                  <CardTitle>Shooting Schedule</CardTitle>
                  <CardDescription>
                    AI-optimized scheduling based on your script breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Complete script breakdown to generate schedules</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="flex-1">
              <UsageAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      <div className="w-80 border-l bg-background">
        <ChatAssistant projectId={projectId!} />
      </div>
    </div>
  );
}