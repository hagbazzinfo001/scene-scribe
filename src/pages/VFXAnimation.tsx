import { useState } from 'react';
import { Sparkles, Upload, Play, Download, Layers, Palette } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

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
                  Scene VFX Analysis
                </CardTitle>
                <CardDescription>
                  AI analysis of scenes requiring visual effects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Scene Description</Label>
                  <Textarea 
                    placeholder="Describe the scene that needs VFX (e.g., 'Character transforms into a spirit in the forest')"
                    className="min-h-[100px]"
                  />
                </div>
                <Button className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze VFX Requirements
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
                  Character Animation
                </CardTitle>
                <CardDescription>
                  AI-assisted character animation and rigging
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Character Type</Label>
                  <Input placeholder="e.g., Human, Spirit, Animal" />
                </div>
                <div className="space-y-2">
                  <Label>Animation Style</Label>
                  <Input placeholder="e.g., Realistic, Stylized, Traditional" />
                </div>
                <div className="space-y-2">
                  <Label>Required Movements</Label>
                  <Textarea 
                    placeholder="Describe the animations needed"
                    className="min-h-[80px]"
                  />
                </div>
                <Button className="w-full" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Animation Plan
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
                  Motion Graphics
                </CardTitle>
                <CardDescription>
                  Create titles, transitions, and motion graphics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Graphics Type</Label>
                  <Input placeholder="e.g., Title Card, Lower Third, Transition" />
                </div>
                <div className="space-y-2">
                  <Label>Text Content</Label>
                  <Input placeholder="Enter text for graphics" />
                </div>
                <div className="space-y-2">
                  <Label>Style Requirements</Label>
                  <Textarea 
                    placeholder="Describe the visual style and mood"
                    className="min-h-[80px]"
                  />
                </div>
                <Button className="w-full">
                  <Palette className="h-4 w-4 mr-2" />
                  Create Motion Graphics
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