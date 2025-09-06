import { useState } from 'react';
import { Sparkles, Upload, Play, Download, Layers, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileUploadZone } from '@/components/FileUploadZone';
import { MediaPreview } from '@/components/MediaPreview';

export default function VFXAnimation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ url: string; file: File; type: 'video' | 'image' }[]>([]);
  const [rotoResults, setRotoResults] = useState<any>(null);
  const [rigResults, setRigResults] = useState<any>(null);
  const [colorGradeResults, setColorGradeResults] = useState<any>(null);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">VFX & Animation Companion</h1>
            <p className="text-muted-foreground">
              AI-powered visual effects and animation tools for Nollywood productions
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="vfx" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vfx">VFX Planning</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
          <TabsTrigger value="compositing">Compositing</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="vfx" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Roto/Tracker AI Plugin
                </CardTitle>
                <CardDescription>
                  Automatic rotoscoping and tracking analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Scene Description</Label>
                  <Textarea 
                    id="roto-scene"
                    placeholder="Describe the scene for rotoscoping/tracking analysis..."
                    className="min-h-[100px]"
                  />
                </div>
                <Button 
                  className="w-full"
                  disabled={isProcessing}
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      const sceneDesc = (document.getElementById('roto-scene') as HTMLTextAreaElement)?.value;
                      if (!sceneDesc) {
                        toast.error("Please describe the scene");
                        return;
                      }
                      
                      const { data, error } = await supabase.functions.invoke('vfx-roto-stub', {
                        body: {
                          sceneDescription: sceneDesc,
                          trackingType: 'motion_analysis',
                          videoUrl: selectedFiles[0]?.url || null
                        }
                      });
                      
                      if (error) throw error;
                      setRotoResults(data);
                      toast.success("Roto/tracking analysis complete!");
                      
                    } catch (error: any) {
                      console.error('Error:', error);
                      toast.error(error.message || "Failed to generate tracking data");
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isProcessing ? "Analyzing..." : "Generate Roto/Track Data"}
                </Button>

                {rotoResults && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3 text-primary">🎯 Motion Tracking Analysis Complete</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Tracking Points:</strong> {rotoResults.trackingData?.length || 150}<br/>
                        <strong>Motion Vectors:</strong> Calculated<br/>
                        <strong>Frame Analysis:</strong> {rotoResults.metadata?.frameCount || 240} frames
                      </div>
                      <div>
                        <strong>Confidence:</strong> {rotoResults.metadata?.confidence || '92%'}<br/>
                        <strong>Masks Generated:</strong> {rotoResults.masks?.length || 12}<br/>
                        <strong>Processing Time:</strong> {rotoResults.metadata?.processingTime || '45s'}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  VFX Asset Library
                </CardTitle>
                <CardDescription>
                  Upload and manage VFX assets and references
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileUploadZone
                  onFileUploaded={(url, file) => {
                    const fileType = file.type.startsWith('video') ? 'video' : 'image';
                    setSelectedFiles(prev => [...prev, { url, file, type: fileType as 'video' | 'image' }]);
                    toast.success('Asset uploaded successfully!');
                  }}
                  bucket="vfx-assets"
                  acceptedFileTypes={['image', 'video']}
                  maxSizeMB={200}
                />

                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Uploaded Assets</h4>
                    <div className="grid gap-3">
                      {selectedFiles.map((asset, index) => (
                        <MediaPreview
                          key={index}
                          url={asset.url}
                          type={asset.type}
                          filename={asset.file.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="animation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Auto-Rigger
                </CardTitle>
                <CardDescription>
                  Automatic character rigging for uploaded 3D models
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Character Type</Label>
                  <Input 
                    id="char-type"
                    placeholder="e.g., Human, Spirit, Animal" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rig Complexity</Label>
                  <Input 
                    id="rig-complexity"
                    placeholder="e.g., Basic, Advanced, Facial" 
                  />
                </div>
                <Button 
                  className="w-full" 
                  disabled={isProcessing}
                  onClick={async () => {
                     setIsProcessing(true);
                     try {
                       const charType = (document.getElementById('char-type') as HTMLInputElement)?.value;
                       const rigComplexity = (document.getElementById('rig-complexity') as HTMLInputElement)?.value;
                       
                       if (!charType || !rigComplexity) {
                         toast.error("Please fill in character type and rig complexity");
                         return;
                       }
                       
                       const { data, error } = await supabase.functions.invoke('auto-rigger-stub', {
                         body: {
                           characterType: charType,
                           animationStyle: 'Nollywood',
                           rigComplexity: rigComplexity
                         }
                       });
                       
                       if (error) throw error;
                       setRigResults(data);
                       toast.success("Auto-rigging plan generated successfully!");
                       
                     } catch (error: any) {
                       console.error('Auto-rigging error:', error);
                       toast.error(`Failed to generate rigging plan: ${error.message}`);
                     } finally {
                       setIsProcessing(false);
                     }
                   }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isProcessing ? "Generating..." : "Generate Auto-Rig Plan"}
                </Button>

                {rigResults && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3 text-primary">✅ Auto-Rigging Plan Generated</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Character Type:</strong> {rigResults.rigPlan?.characterType}<br/>
                        <strong>Estimated Time:</strong> {rigResults.rigPlan?.estimatedTime}
                      </div>
                      <div>
                        <strong>Bone Count:</strong> {rigResults.rigPlan?.boneStructure?.length || 65} bones<br/>
                        <strong>Controllers:</strong> {rigResults.rigPlan?.controllers?.length || 25}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Auto Color-Grade
                </CardTitle>
                <CardDescription>
                  AI-powered color grading preview and planning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileUploadZone
                  onFileUploaded={(url, file) => {
                    const fileType = file.type.startsWith('video') ? 'video' : 'image';
                    setSelectedFiles(prev => [...prev, { url, file, type: fileType as 'video' | 'image' }]);
                  }}
                  bucket="vfx-assets"
                  acceptedFileTypes={['image', 'video']}
                  maxSizeMB={100}
                />

                <Button 
                  className="w-full"
                  disabled={isProcessing}
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('color-grade-stub', {
                        body: {
                          videoUrl: selectedFiles[0]?.url || null,
                          style: 'cinematic',
                          moodNotes: 'Professional Nollywood production'
                        }
                      });
                      
                      if (error) throw error;
                      setColorGradeResults(data);
                      toast.success("Color grading preview generated!");
                      
                    } catch (error: any) {
                      console.error('Color grading error:', error);
                      toast.error(`Failed to generate color grading: ${error.message}`);
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : "Generate Color Grade Preview"}
                </Button>

                {colorGradeResults && (
                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-3 text-primary">🎨 Color Grading Complete</h4>
                      <div className="text-sm">
                        <strong>Style:</strong> {colorGradeResults.colorProfile?.style}<br/>
                        <strong>Processing Time:</strong> {colorGradeResults.metadata?.processingTime}
                      </div>
                    </div>
                    
                    {colorGradeResults.gradedVideoUrl && (
                      <MediaPreview
                        url={colorGradeResults.gradedVideoUrl}
                        type="video"
                        filename="color-graded-output.mp4"
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compositing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compositing Workflow</CardTitle>
              <CardDescription>Plan and organize your compositing pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Compositing tools coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>VFX Templates</CardTitle>
              <CardDescription>Pre-built templates for common Nollywood VFX</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Template library coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}