import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Center } from '@react-three/drei';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  useState(() => {
    if (currentJob?.status === 'done' && currentJob.output_data) {
      const output = currentJob.output_data as any;
      if (output.output_url) {
        setModelUrl(output.output_url);
      }
    }
  });

  const handleDownload = async () => {
    if (!modelUrl) return;
    window.open(modelUrl, '_blank');
    toast.success('Downloading 3D model...');
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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Box className="h-8 w-8 text-primary" />
            {t('mesh_generator', 'Reeva Mesh Generator')}
            <Badge variant="secondary">Beta</Badge>
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              {credits} {t('credits', 'Credits')}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground">
          {t('mesh_generator_desc', 'Generate quick 3D assets from text or images for your film or animation projects.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Input Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('text_prompt', 'Text Prompt')}</CardTitle>
              <CardDescription>
                {t('text_prompt_desc', 'Describe the 3D model you want to create')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">{t('prompt', 'Prompt')}</Label>
                <Input
                  id="prompt"
                  placeholder="e.g., A cute cartoon character with big eyes"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('image_prompt', 'Image Prompt')}</CardTitle>
              <CardDescription>
                {t('image_prompt_desc', 'Or upload a reference image')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploadZone
                bucket="vfx-assets"
                acceptedFileTypes={['image']}
                maxSizeMB={10}
                onFileUploaded={handleFileUploaded}
              />
              {imageUrl && (
                <div className="mt-4">
                  <MediaPreview url={imageUrl} type="image" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('advanced_options', 'Advanced Options')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file-type">{t('file_type', 'File Type')}</Label>
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger id="file-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="glb">GLB</SelectItem>
                    <SelectItem value="obj">OBJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="target-faces">{t('target_face_number', 'Target Face Number')}</Label>
                  <span className="text-sm text-muted-foreground">{targetFaces.toLocaleString()}</span>
                </div>
                <Slider
                  id="target-faces"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={[targetFaces]}
                  onValueChange={(v) => setTargetFaces(v[0])}
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>{t('estimated_time', 'Estimated Time')}:</span>
                  <span className="font-medium">1-2 min</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span>{t('credits_cost', 'Credits Cost')}:</span>
                  <span className="font-medium">25 credits</span>
                </div>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || isPolling || (!imageUrl && !promptInput)}
                className="w-full"
                size="lg"
              >
                {isGenerating || isPolling ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t('generating', 'Generating...')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    {t('gen_shape', 'Gen Shape')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - 3D Viewer */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('generated_mesh', 'Generated Mesh')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-secondary rounded-lg overflow-hidden" style={{ height: '500px' }}>
                {modelUrl ? (
                  <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                    <Suspense fallback={null}>
                      <Stage environment="city" intensity={0.6}>
                        <Center>
                          <Model url={modelUrl} />
                        </Center>
                      </Stage>
                      <OrbitControls makeDefault />
                    </Suspense>
                  </Canvas>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    {isPolling ? (
                      <>
                        <Loader2 className="h-16 w-16 animate-spin mb-4" />
                        <p className="font-medium">{t('processing', 'Processing your request...')}</p>
                        <p className="text-sm">{t('please_wait', 'This may take 1-2 minutes')}</p>
                      </>
                    ) : (
                      <>
                        <Box className="h-24 w-24 mb-4 opacity-20" />
                        <p>{t('welcome_to_mesh', 'Welcome to Reeva Mesh!')}</p>
                        <p className="text-sm">{t('no_mesh_here', 'No mesh here.')}</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {modelUrl && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button onClick={handleDownload} variant="default">
                    <Download className="h-4 w-4 mr-2" />
                    {t('download', 'Download')}
                  </Button>
                  <Button onClick={handleSaveToAssets} variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    {t('save_to_assets', 'Save to Assets')}
                  </Button>
                  <Button onClick={handleClear} variant="outline" className="col-span-2">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('clear', 'Clear')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {currentJob?.error_message && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">{t('error', 'Error')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{currentJob.error_message}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
