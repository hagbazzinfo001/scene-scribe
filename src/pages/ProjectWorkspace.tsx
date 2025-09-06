import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Upload, FileText, Users, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatAssistant } from '@/components/ChatAssistant';

export default function ProjectWorkspace() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Fetch project details
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          scripts(*),
          project_collaborators(*)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;

      // Fetch breakdowns separately
      const { data: breakdowns } = await supabase
        .from('breakdowns')
        .select('*')
        .in('script_id', (data.scripts || []).map((s: any) => s.id));

      return { ...data, breakdowns: breakdowns || [] };
    },
    enabled: !!projectId,
  });

  // Upload script mutation
  const uploadScriptMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const content = await file.text();
      
      // First, upload the script
      const { data: script, error } = await supabase
        .from('scripts')
        .insert([
          {
            project_id: projectId!,
            title: file.name.replace(/\.[^/.]+$/, ""),
            content: content,
            file_type: fileExt,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Then analyze the script automatically
      const analysisResponse = await supabase.functions.invoke('script-analyzer', {
        body: {
          scriptContent: content,
          scriptId: script.id
        }
      });

      if (analysisResponse.error) {
        console.error('Analysis error:', analysisResponse.error);
        // Don't fail the upload if analysis fails
      }

      return script;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: "Script uploaded and analyzed",
        description: "Your script has been uploaded and automatically analyzed for breakdown.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type (for MVP, accept text files)
    const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a TXT, PDF, or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadScriptMutation.mutateAsync(file);
    } finally {
      setUploading(false);
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
          <Tabs defaultValue="scripts" className="h-full flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="scripts">Scripts</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="scripts" className="flex-1">
              <div className="space-y-4">
                {/* Script Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Upload Script
                    </CardTitle>
                    <CardDescription>
                      Upload your script in TXT, PDF, or DOCX format for AI analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                      <div className="text-center">
                        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                        <Label htmlFor="script-upload" className="cursor-pointer">
                          <div className="text-sm">
                            <span className="text-primary font-medium">Click to upload</span> or drag and drop
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            TXT, PDF or DOCX (Max 10MB)
                          </div>
                        </Label>
                        <Input
                          id="script-upload"
                          type="file"
                          className="hidden"
                          accept=".txt,.pdf,.docx"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Scripts List */}
                {project.scripts && project.scripts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Uploaded Scripts</h3>
                    {project.scripts.map((script: any) => (
                      <Card key={script.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              {script.title}
                            </div>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            {script.content ? (
                              <div className="max-h-32 overflow-y-auto bg-muted p-2 rounded text-xs">
                                {script.content.substring(0, 300)}...
                              </div>
                            ) : (
                              "No content available"
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="flex-1">
              {project?.breakdowns && project.breakdowns.length > 0 ? (
                <div className="space-y-4">
                  {project.breakdowns.map((breakdown: any) => (
                    <Card key={breakdown.id}>
                      <CardHeader>
                        <CardTitle>Script Analysis</CardTitle>
                        <CardDescription>
                          AI-generated analysis of scenes, characters, props, and locations
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Scenes */}
                          {breakdown.content?.scenes && (
                            <div>
                              <h4 className="font-semibold mb-2">Scenes ({breakdown.content.scenes.length})</h4>
                              <div className="grid gap-2 max-h-40 overflow-y-auto">
                                {breakdown.content.scenes.slice(0, 5).map((scene: any, idx: number) => (
                                  <div key={idx} className="text-sm border rounded p-2">
                                    <div className="font-medium">Scene {scene.number}: {scene.location}</div>
                                    <div className="text-muted-foreground">VFX: {scene.vfxNeeds} | SFX: {scene.sfxNeeds}</div>
                                  </div>
                                ))}
                                {breakdown.content.scenes.length > 5 && (
                                  <div className="text-sm text-muted-foreground text-center">
                                    +{breakdown.content.scenes.length - 5} more scenes
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Characters */}
                          {breakdown.content?.characters && (
                            <div>
                              <h4 className="font-semibold mb-2">Characters ({breakdown.content.characters.length})</h4>
                              <div className="flex flex-wrap gap-2">
                                {breakdown.content.characters.map((char: any, idx: number) => (
                                  <div key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                    {char.name} ({char.importance})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Overview */}
                          {breakdown.content?.overallAnalysis && (
                            <div>
                              <h4 className="font-semibold mb-2">Production Analysis</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>Genre: {breakdown.content.overallAnalysis.genre}</div>
                                <div>Budget: {breakdown.content.overallAnalysis.estimatedBudget}</div>
                                <div>VFX Intensity: {breakdown.content.overallAnalysis.vfxIntensity}</div>
                                <div>Shooting Days: {breakdown.content.overallAnalysis.shootingDays}</div>
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
                    <CardTitle>Script Breakdown</CardTitle>
                    <CardDescription>
                      AI-generated analysis of scenes, characters, props, and locations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Upload a script to see AI-generated breakdowns</p>
                    </div>
                  </CardContent>
                </Card>
              )}
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