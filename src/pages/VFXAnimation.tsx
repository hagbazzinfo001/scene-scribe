import { useState } from 'react';
import { Sparkles, Upload, Play, Download, Layers, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { aiService } from '@/services/aiService';
import { toast } from 'sonner';

export default function VFXAnimation() {
  const [isGenerating, setIsGenerating] = useState(false);

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
            {/* VFX Scene Analysis */}
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
                  disabled={isGenerating}
                  onClick={async () => {
                    setIsGenerating(true);
                    try {
                      const sceneDesc = (document.getElementById('roto-scene') as HTMLTextAreaElement)?.value;
                      if (!sceneDesc) {
                        toast.error("Please describe the scene");
                        return;
                      }
                      
                      const { data } = await aiService.planVFX(sceneDesc, 'roto', 'demo-project');
                      console.log('Roto plan:', data);
                      toast.success("Roto/tracking plan generated!");
                    } catch (error) {
                      console.error('Error:', error);
                      toast.error("Failed to generate plan");
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGenerating ? "Analyzing..." : "Generate Roto/Track Plan"}
                </Button>
              </CardContent>
            </Card>

            {/* VFX Asset Library */}
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
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                    <Label htmlFor="vfx-upload" className="cursor-pointer">
                      <div className="text-sm">
                        <span className="text-primary font-medium">Upload VFX assets</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Images, videos, 3D models
                      </div>
                    </Label>
                    <Input
                      id="vfx-upload"
                      type="file"
                      className="hidden"
                      multiple
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VFX Shot List */}
          <Card>
            <CardHeader>
              <CardTitle>VFX Shot Breakdown</CardTitle>
              <CardDescription>
                Detailed breakdown of VFX shots for production planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-4 text-sm font-medium border-b pb-2">
                  <div>Shot #</div>
                  <div>Scene</div>
                  <div>VFX Type</div>
                  <div>Complexity</div>
                  <div>Est. Time</div>
                  <div>Budget</div>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Upload a script or describe scenes to generate VFX breakdown</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="animation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Character Animation */}
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
                <div className="space-y-2">
                  <Label>Upload Character File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".obj,.fbx,.blend"
                  />
                </div>
                <Button 
                  className="w-full" 
                  disabled={isGenerating}
                  onClick={async () => {
                    setIsGenerating(true);
                    try {
                      const charType = (document.getElementById('char-type') as HTMLInputElement)?.value;
                      const rigComplexity = (document.getElementById('rig-complexity') as HTMLInputElement)?.value;
                      
                      if (!charType || !rigComplexity) {
                        toast.error("Please fill in character type and rig complexity");
                        return;
                      }
                      
                      const { data } = await aiService.planRigging(charType, 'Nollywood', rigComplexity, 'demo-project');
                      console.log('Rig plan:', data);
                      toast.success("Auto-rigging plan generated!");
                    } catch (error) {
                      console.error('Error:', error);
                      toast.error("Failed to generate rigging plan");
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Auto-Rig Plan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Motion Graphics */}
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
                <div className="space-y-2">
                  <Label>Scene Mood</Label>
                  <Input 
                    id="scene-mood"
                    placeholder="e.g., Dramatic, Romantic, Action" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Upload Test Footage</Label>
                  <Input
                    id="footage-upload"
                    type="file"
                    accept=".mp4,.mov,.avi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Style Notes</Label>
                  <Textarea 
                    placeholder="Describe the desired look and feel..."
                    className="min-h-[80px]"
                  />
                </div>
                <Button 
                  className="w-full"
                  disabled={isGenerating}
                  onClick={async () => {
                    setIsGenerating(true);
                    try {
                      const sceneMood = (document.getElementById('scene-mood') as HTMLInputElement)?.value;
                      if (!sceneMood) {
                        toast.error("Please describe the scene mood");
                        return;
                      }
                      
                      const { data } = await aiService.planVFX(`Scene with ${sceneMood} mood`, 'color-grade', 'demo-project');
                      console.log('Color grade plan:', data);
                      toast.success("Color grading plan generated!");
                    } catch (error) {
                      console.error('Error:', error);
                      toast.error("Failed to generate color grading plan");
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  {isGenerating ? "Analyzing..." : "Generate Color Grade Preview"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compositing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Compositing Workflow
              </CardTitle>
              <CardDescription>
                Plan and execute complex compositing shots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Background Plate</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload background</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Foreground Elements</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload elements</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Compositing Notes</Label>
                <Textarea 
                  placeholder="Describe the compositing requirements, lighting, shadows, etc."
                  className="min-h-[100px]"
                />
              </div>
              <Button className="w-full">
                <Layers className="h-4 w-4 mr-2" />
                Generate Compositing Guide
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Template Cards */}
            {[
              { title: "Nollywood Title Cards", description: "Traditional Nollywood movie title templates" },
              { title: "Spirit Transformations", description: "VFX templates for supernatural scenes" },
              { title: "Market Scene VFX", description: "Enhancement templates for market scenes" },
              { title: "Traditional Wedding", description: "Motion graphics for wedding scenes" },
              { title: "Action Sequences", description: "VFX templates for action scenes" },
              { title: "Cultural Elements", description: "Animation templates for cultural elements" }
            ].map((template, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg mb-4 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}