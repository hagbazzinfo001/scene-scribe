import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserTier } from '@/hooks/useUserTier';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Film, Sparkles, Lock, Play, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate, useNavigate } from 'react-router-dom';

export default function MotionGenerator() {
  const { user, loading: authLoading } = useAuth();
  const { canAccessFeature, tier, getTierLabel, getTierColor, hasFullAccess } = useUserTier();
  const navigate = useNavigate();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedMotion, setGeneratedMotion] = useState<{
    id: string;
    name: string;
    duration: string;
    format: string;
  } | null>(null);

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

  const hasAccess = canAccessFeature('motion-generator');

  if (!hasAccess) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Logo Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Film className="h-12 w-12 text-primary" />
              <h1 className="text-3xl font-bold">Motion Generator</h1>
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
                Motion Generator is an exclusive feature for Studio plan members. 
                Generate professional mocap data from text descriptions for your film productions.
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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the motion you want to generate');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    // Simulate generation progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      // TODO: Implement actual motion generation API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(interval);
      setProgress(100);

      setGeneratedMotion({
        id: `motion_${Date.now()}`,
        name: prompt.slice(0, 30) + '...',
        duration: '3.5s',
        format: 'FBX/BVH',
      });

      toast.success('Motion generated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate motion');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (format: string) => {
    toast.info(`Downloading ${format} file... (Demo - actual download coming soon)`);
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Logo Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Film className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Motion Generator</h1>
              <p className="text-muted-foreground">AI-powered mocap data generation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getTierColor()}>{getTierLabel()}</Badge>
            <Badge variant="outline" className="text-primary border-primary">
              Studio Feature
            </Badge>
          </div>
        </div>

        {/* Welcome Section */}
        <Card className="mb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-2">Welcome to Motion Generator</h2>
            <p className="text-muted-foreground">
              Describe any motion or action in natural language, and our AI will generate 
              professional-grade mocap data compatible with Maya, Blender, and Unreal Engine.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Describe Your Motion</CardTitle>
              <CardDescription>
                Be specific about the action, speed, and style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., A character performing a dramatic sword swing from right to left, followed by a defensive stance..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="resize-none"
              />

              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Generating motion...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim()}
                className="w-full gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Generate Motion
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Motion</CardTitle>
              <CardDescription>
                Preview and download your mocap data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedMotion ? (
                <div className="space-y-4">
                  {/* Preview Placeholder */}
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                    <div className="text-center">
                      <Film className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Motion Preview</p>
                      <p className="text-xs text-muted-foreground/60">3D preview coming soon</p>
                    </div>
                  </div>

                  {/* Motion Info */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Name</span>
                      <span className="text-sm font-medium">{generatedMotion.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="text-sm font-medium">{generatedMotion.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Format</span>
                      <span className="text-sm font-medium">{generatedMotion.format}</span>
                    </div>
                  </div>

                  {/* Download Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload('FBX')}>
                      <Download className="h-4 w-4 mr-1" />
                      FBX
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload('BVH')}>
                      <Download className="h-4 w-4 mr-1" />
                      BVH
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload('GLB')}>
                      <Download className="h-4 w-4 mr-1" />
                      GLB
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Describe a motion and click generate to create mocap data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
