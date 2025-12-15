import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserTier } from '@/hooks/useUserTier';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout, Sparkles, Lock, Plus, Image, Palette, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate, useNavigate } from 'react-router-dom';

interface StoryboardFrame {
  id: string;
  scene: string;
  description: string;
  notes: string;
  mood: string;
}

export default function Storyboard() {
  const { user, loading: authLoading } = useAuth();
  const { canAccessFeature, getTierLabel, getTierColor } = useUserTier();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('storyboard');
  const [frames, setFrames] = useState<StoryboardFrame[]>([]);
  const [moodColors, setMoodColors] = useState<string[]>(['#1a1a2e', '#16213e', '#0f3460', '#e94560']);
  const [projectName, setProjectName] = useState('Untitled Project');

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasAccess = canAccessFeature('storyboard');

  if (!hasAccess) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Logo Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Layout className="h-12 w-12 text-primary" />
              <h1 className="text-3xl font-bold">Storyboard & Moodboard</h1>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              Studio Access Only
            </Badge>
          </div>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-8 text-center">
              <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Studio Feature</h2>
              <p className="text-muted-foreground mb-6">
                Storyboard and Moodboard tools are exclusive features for Studio plan members. 
                Plan your scenes visually and establish the mood for your productions.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => navigate('/studio-waitlist')} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Join Studio Waitlist
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const addFrame = () => {
    const newFrame: StoryboardFrame = {
      id: `frame_${Date.now()}`,
      scene: `Scene ${frames.length + 1}`,
      description: '',
      notes: '',
      mood: '',
    };
    setFrames([...frames, newFrame]);
    toast.success('New frame added');
  };

  const updateFrame = (id: string, field: keyof StoryboardFrame, value: string) => {
    setFrames(frames.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const deleteFrame = (id: string) => {
    setFrames(frames.filter(f => f.id !== id));
    toast.success('Frame deleted');
  };

  const addMoodColor = () => {
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    setMoodColors([...moodColors, randomColor]);
  };

  const exportStoryboard = () => {
    toast.info('Exporting storyboard... (Demo - actual export coming soon)');
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Layout className="h-10 w-10 text-primary" />
            <div>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="text-2xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0"
              />
              <p className="text-muted-foreground">Visual planning tools</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getTierColor()}>{getTierLabel()}</Badge>
            <Badge variant="outline" className="text-primary border-primary">
              Studio Feature
            </Badge>
          </div>
        </div>

        {/* Welcome Banner */}
        <Card className="mb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-2">Welcome to Visual Planning</h2>
            <p className="text-muted-foreground">
              Create storyboards to plan your scenes and moodboards to establish the visual 
              tone of your production. Export to PDF or share with your team.
            </p>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="storyboard" className="gap-2">
              <Image className="h-4 w-4" />
              Storyboard
            </TabsTrigger>
            <TabsTrigger value="moodboard" className="gap-2">
              <Palette className="h-4 w-4" />
              Moodboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="storyboard" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Storyboard Frames</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportStoryboard}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button size="sm" onClick={addFrame}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Frame
                </Button>
              </div>
            </div>

            {frames.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No frames yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start building your storyboard by adding frames
                  </p>
                  <Button onClick={addFrame}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Frame
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {frames.map((frame, index) => (
                  <Card key={frame.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Input
                          value={frame.scene}
                          onChange={(e) => updateFrame(frame.id, 'scene', e.target.value)}
                          className="font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteFrame(frame.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Image placeholder */}
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20 cursor-pointer hover:border-primary/50 transition-colors">
                        <div className="text-center">
                          <Image className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Click to add image</p>
                        </div>
                      </div>
                      
                      <Textarea
                        placeholder="Scene description..."
                        value={frame.description}
                        onChange={(e) => updateFrame(frame.id, 'description', e.target.value)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                      
                      <Input
                        placeholder="Director notes..."
                        value={frame.notes}
                        onChange={(e) => updateFrame(frame.id, 'notes', e.target.value)}
                        className="text-sm"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="moodboard" className="space-y-6">
            {/* Color Palette */}
            <Card>
              <CardHeader>
                <CardTitle>Color Palette</CardTitle>
                <CardDescription>Define the visual mood of your project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4">
                  {moodColors.map((color, index) => (
                    <div 
                      key={index}
                      className="w-16 h-16 rounded-lg cursor-pointer border-2 border-transparent hover:border-primary transition-colors"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        const newColor = prompt('Enter new color (hex):', color);
                        if (newColor) {
                          const newColors = [...moodColors];
                          newColors[index] = newColor;
                          setMoodColors(newColors);
                        }
                      }}
                    />
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-16 h-16"
                    onClick={addMoodColor}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reference Images */}
            <Card>
              <CardHeader>
                <CardTitle>Reference Images</CardTitle>
                <CardDescription>Upload images that inspire your visual direction</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i}
                      className="aspect-square bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <div className="text-center">
                        <Plus className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Add image</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Creative Notes</CardTitle>
                <CardDescription>Document your visual vision</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Describe the overall mood, lighting style, color grading direction, visual references..."
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
