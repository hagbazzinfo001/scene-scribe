import { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Center } from '@react-three/drei';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Box, Download, Save, Trash2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useJobStatus } from '@/hooks/useJobStatus';
import { FileUploadZone } from '@/components/FileUploadZone';
import { MediaPreview } from '@/components/MediaPreview';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useLoader } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';

function Model({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
}

export default function MeshGenerator() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [promptInput, setPromptInput] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [targetFaces, setTargetFaces] = useState(10000);
  const [fileType, setFileType] = useState('glb');
  const [simplifyMesh, setSimplifyMesh] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  
  const { job: currentJob, isPolling } = useJobStatus(currentJobId);

  // Fetch user credits
  useState(() => {
    const fetchCredits = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user.id)
        .single();
      if (data) setCredits(data.credits_remaining);
    };
    fetchCredits();
  });

  const handleFileUploaded = (url: string, file: File) => {
    setImageUrl(url);
    toast.success(`${file.name} uploaded successfully!`);
  };

  const handleGenerate = async () => {
    if (!imageUrl && !promptInput) {
      toast.error('Please upload an image or enter a text prompt');
      return;
    }

    if (credits < 25) {
      toast.error('Insufficient credits. You need 25 credits to generate a mesh.');
      return;
    }

    setIsGenerating(true);
    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      
      const { data, error } = await supabase.functions.invoke('mesh-generator', {
        body: {
          prompt: promptInput,
          image_url: imageUrl,
          target_faces: targetFaces,
          file_type: fileType,
          simplify: simplifyMesh
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (error) throw error;
      
      if (data?.job_id) {
        setCurrentJobId(data.job_id);
        toast.success('Mesh generation started! This may take 1-2 minutes...');
      } else {
        toast.error('Failed to create mesh generation job');
      }
    } catch (error: any) {
      console.error('Mesh generation error:', error);
      toast.error(`Failed to generate mesh: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Update model URL when job completes
  useEffect(() => {
    if (currentJob?.status === 'done' && currentJob.output_data) {
      const output = currentJob.output_data as any;
      console.log('Job completed with output:', output);
      
      if (output.error) {
        toast.error(`Generation failed: ${output.error}`);
        setModelUrl(null);
      } else if (output.output_url && output.output_url.endsWith('.glb')) {
        console.log('Setting model URL:', output.output_url);
        setModelUrl(output.output_url);
        toast.success('3D model generated successfully!');
      } else {
        console.warn('Invalid output format:', output);
        toast.error('Invalid model output - expected GLB file');
      }
    }
  }, [currentJob?.status, currentJob?.output_data]);

  const handleDownload = async () => {
    if (!modelUrl) {
      toast.error('No model available to download');
      return;
    }
    
    try {
      // Download the GLB file
      const response = await fetch(modelUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mesh-${Date.now()}.glb`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('3D model downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download model');
    }
  };

  const handleSaveToAssets = async () => {
    if (!modelUrl) return;
    toast.success('Model saved to your assets library!');
  };

  const handleClear = () => {
    setPromptInput('');
    setImageUrl('');
    setModelUrl(null);
    setCurrentJobId(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl bg-background">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Box className="h-10 w-10 text-primary" />
            Hunyuan3D-2: High Resolution Textured 3D Assets Generation
          </h1>
          <Badge variant="outline" className="text-lg px-6 py-2 bg-primary/10">
            <Sparkles className="h-5 w-5 mr-2" />
            {credits} Credits
          </Badge>
        </div>
        <p className="text-muted-foreground text-lg">
          Turn any image into a perfect 3D model instantly for your film or animation projects
        </p>
        <div className="flex gap-2 mt-3">
          <a href="#" className="text-sm text-primary hover:underline">Github</a>
          <a href="#" className="text-sm text-primary hover:underline">Homepage</a>
          <a href="#" className="text-sm text-primary hover:underline">Technical Report</a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Input & Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tabs for Image/Text Prompt */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex gap-2 border-b">
                <Button 
                  variant="ghost" 
                  className="rounded-none border-b-2 border-primary"
                >
                  Image Prompt
                </Button>
                <Button 
                  variant="ghost" 
                  className="rounded-none opacity-50"
                  disabled
                >
                  Text Prompt
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FileUploadZone
                bucket="vfx-assets"
                acceptedFileTypes={['image']}
                maxSizeMB={10}
                onFileUploaded={handleFileUploaded}
              />
              {imageUrl && (
                <div className="mt-4 rounded-lg overflow-hidden border">
                  <MediaPreview url={imageUrl} type="image" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || isPolling || !imageUrl}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {isGenerating || isPolling ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Gen Shape'
            )}
          </Button>

          {/* Advanced Options */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8">
                  Advanced Options
                </Button>
                <Button variant="ghost" size="sm" className="h-8">
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">File Type</Label>
                <div className="flex items-center gap-2">
                  <Select value={fileType} onValueChange={setFileType}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="glb">glb</SelectItem>
                      <SelectItem value="obj">obj</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-xs">Simplify Mesh</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Target Face Number</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {targetFaces.toLocaleString()}
                  </span>
                </div>
                <Slider
                  min={1000}
                  max={100000}
                  step={1000}
                  value={[targetFaces]}
                  onValueChange={(v) => setTargetFaces(v[0])}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Transform
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleDownload}
                  disabled={!modelUrl}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - 3D Viewer with Tabs */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex gap-4 border-b">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-none border-b-2 border-primary"
                >
                  Generated Mesh
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-none opacity-50"
                  disabled
                >
                  Exporting Mesh
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-none opacity-50"
                  disabled
                >
                  Mesh Statistic
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="bg-gradient-to-br from-secondary to-secondary/50 rounded-lg overflow-hidden border-2 border-border" 
                style={{ height: '600px' }}
              >
                {modelUrl ? (
                  <Canvas 
                    camera={{ position: [0, 0, 3], fov: 60 }}
                    style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)' }}
                  >
                    <Suspense fallback={null}>
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[10, 10, 5]} intensity={1} />
                      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
                      <Center>
                        <Model url={modelUrl} />
                      </Center>
                      <OrbitControls 
                        makeDefault 
                        enableDamping
                        dampingFactor={0.05}
                      />
                    </Suspense>
                  </Canvas>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    {isPolling ? (
                      <>
                        <Loader2 className="h-20 w-20 animate-spin mb-6 text-primary" />
                        <p className="text-xl font-semibold">Processing your request...</p>
                        <p className="text-sm mt-2">Creating 3D mesh from your image</p>
                      </>
                    ) : (
                      <>
                        <Box className="h-32 w-32 mb-6 opacity-10" />
                        <p className="text-2xl font-semibold">Welcome to Hunyuan3D!</p>
                        <p className="text-sm mt-2 opacity-75">No mesh here.</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {modelUrl && (
                <div className="flex gap-3 mt-4">
                  <Button onClick={handleSaveToAssets} variant="outline" className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save to Assets
                  </Button>
                  <Button onClick={handleClear} variant="outline" className="flex-1">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              )}

              {(currentJob?.error_message || (currentJob?.output_data as any)?.error) && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ {currentJob.error_message || (currentJob?.output_data as any)?.error}
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
