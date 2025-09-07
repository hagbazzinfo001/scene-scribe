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

  // Fetch analysis results
  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('analysis_cache')
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
        table: 'analysis_cache',
        filter: `project_id=eq.${projectId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['analyses', projectId] });
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

  const exportAnalysis = (analysis: any, format: 'json' | 'csv' | 'pdf' = 'json') => {
    if (format === 'csv' && analysis.result.scenes) {
      // CSV export for script breakdown
      const csvData = [
        ['Scene', 'Location', 'Time', 'Characters', 'Description', 'Props'],
        ...analysis.result.scenes.map((scene: any) => [
          scene.number || '',
          scene.location || '',
          scene.time || '',
          (scene.characters || []).join(', '),
          scene.description || '',
          (scene.props || []).join(', ')
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
    } else if (format === 'pdf' && analysis.result.scenes) {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Script Breakdown', 14, 20);
      let y = 30;
      const scenes = analysis.result.scenes as any[];
      scenes.slice(0, 100).forEach((scene: any, idx: number) => {
        const line = `Scene ${scene.number || idx + 1} - ${scene.location || ''} - ${scene.time || ''}`;
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
    } else {
      // JSON export (default)
      const dataStr = JSON.stringify(analysis.result, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analysis-${analysis.analysis_type}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
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
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Invite
              </Button>
              <Button variant="outline" size="sm">
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
                {/* Import Assets */}
                <ImportAssetDropzone 
                  projectId={projectId!} 
                  onAssetUploaded={handleAssetUploaded}
                />

                {/* Assets List */}
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
              {analyses.length > 0 ? (
                <div className="space-y-4">
                  {analyses.map((analysis: any) => (
                    <Card key={analysis.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{analysis.analysis_type.replace('super_breakdown_', '').toUpperCase()} Analysis</span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => exportAnalysis(analysis, 'csv')}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export CSV
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => exportAnalysis(analysis, 'pdf')}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => exportAnalysis(analysis)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export JSON
                            </Button>
                          </div>
                        </CardTitle>
                        <CardDescription>
                          AI-generated breakdown and analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Script Analysis */}
                          {analysis.analysis_type.includes('script') && analysis.result.scenes && (
                            <>
                              <div>
                                <h4 className="font-semibold mb-2">Scenes ({analysis.result.scenes.length})</h4>
                                <div className="grid gap-2 max-h-40 overflow-y-auto">
                                  {analysis.result.scenes.slice(0, 5).map((scene: any, idx: number) => (
                                    <div key={idx} className="text-sm border rounded p-2">
                                      <div className="font-medium">Scene {scene.number}: {scene.location}</div>
                                      <div className="text-muted-foreground">{scene.description}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {analysis.result.characters && (
                                <div>
                                  <h4 className="font-semibold mb-2">Characters ({analysis.result.characters.length})</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {analysis.result.characters.map((char: any, idx: number) => (
                                      <Badge key={idx} variant="secondary">
                                        {char.name} ({char.importance})
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Audio Analysis */}
                          {analysis.analysis_type.includes('audio') && (
                            <div>
                              <h4 className="font-semibold mb-2">Audio Transcript</h4>
                              <div className="text-sm bg-muted p-3 rounded">
                                {analysis.result.transcript || 'No transcript available'}
                              </div>
                              {analysis.result.speakers && (
                                <div className="mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    Speakers: {analysis.result.speakers.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Video Analysis */}
                          {analysis.analysis_type.includes('video') && (
                            <div>
                              <h4 className="font-semibold mb-2">Video Analysis</h4>
                              {analysis.result.shots && (
                                <div className="space-y-2">
                                  {analysis.result.shots.slice(0, 3).map((shot: any, idx: number) => (
                                    <div key={idx} className="text-sm border rounded p-2">
                                      <div className="font-medium">{shot.description}</div>
                                      <div className="text-muted-foreground">
                                        {shot.startTime}s - {shot.endTime}s
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {analysis.result.vfxFlags && (
                                <div className="mt-3">
                                  <h5 className="font-medium mb-1">VFX Requirements</h5>
                                  <div className="flex flex-wrap gap-1">
                                    {analysis.result.vfxFlags.map((flag: string, idx: number) => (
                                      <Badge key={idx} variant="outline">{flag}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Image Analysis */}
                          {analysis.analysis_type.includes('image') && (
                            <div>
                              <h4 className="font-semibold mb-2">Image Analysis</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>Tags: {analysis.result.tags?.join(', ') || 'None'}</div>
                                <div>Composition: {analysis.result.composition || 'Unknown'}</div>
                                <div>Lighting: {analysis.result.lighting || 'Unknown'}</div>
                                <div>VFX Suitability: {analysis.result.vfxSuitability || 'Unknown'}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Super Breakdown Analysis</CardTitle>
                    <CardDescription>
                      AI-generated analysis of your uploaded assets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Upload assets to see AI-generated breakdowns</p>
                    </div>
                  </CardContent>
                </Card>
              )}
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