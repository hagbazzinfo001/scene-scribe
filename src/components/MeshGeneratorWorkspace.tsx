import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FileUploadZone } from '@/components/FileUploadZone';
import { MediaPreview } from '@/components/MediaPreview';
import { Box, Upload, Sparkles, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useJobStatus } from '@/hooks/useJobStatus';
import { useTranslation } from 'react-i18next';

interface MeshGeneratorWorkspaceProps {
  projectId?: string;
}

export function MeshGeneratorWorkspace({ projectId }: MeshGeneratorWorkspaceProps) {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageType, setImageType] = useState<string>('');
  const [meshName, setMeshName] = useState('');
  const [aiModel, setAiModel] = useState('meshy-6-preview');
  const [multiView, setMultiView] = useState(false);
  const [artPose, setArtPose] = useState(false);
  const [license, setLicense] = useState('CC-BY-4.0');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { job: currentJob, isPolling } = useJobStatus(currentJobId);

  const handleFileUploaded = (url: string, file: File) => {
    setImageUrl(url);
    setImageType(file.type);
    toast.success(`${file.name} uploaded successfully!`);
  };

  const handleGenerate = async () => {
    if (!imageUrl) {
      toast.error('Please upload an image first');
      return;
    }

    if (!meshName.trim()) {
      toast.error('Please enter a name for your mesh');
      return;
    }

    setIsGenerating(true);
    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke('mesh-generator', {
        body: {
          project_id: projectId,
          image_url: imageUrl,
          name: meshName,
          ai_model: aiModel,
          multi_view: multiView,
          art_pose: artPose,
          license: license
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (error) throw error;
      
      if (data?.job_id) {
        setCurrentJobId(data.job_id);
        toast.success('Mesh generation started! Processing in background...');
      } else {
        toast.error('Failed to create mesh generation job');
      }
    } catch (error: any) {
      toast.error(`Failed to generate mesh: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Input */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('image_input', 'Image Input')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadZone
              bucket="vfx-assets"
              acceptedFileTypes={['image']}
              maxSizeMB={20}
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
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {t('mesh_generation', '3D Mesh Generation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('name', 'Name')}</Label>
              <Input
                placeholder="Give your generation a name"
                value={meshName}
                onChange={(e) => setMeshName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('ai_model', 'AI Model')}</Label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meshy-6-preview">Meshy 6 Preview</SelectItem>
                  <SelectItem value="meshy-5">Meshy 5</SelectItem>
                  <SelectItem value="meshy-4">Meshy 4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="multi-view">{t('multi_view', 'Multi-view')}</Label>
              <Switch
                id="multi-view"
                checked={multiView}
                onCheckedChange={setMultiView}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="art-pose">{t('art_pose', 'A/T Pose')}</Label>
              <Switch
                id="art-pose"
                checked={artPose}
                onCheckedChange={setArtPose}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('license', 'License')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={license === 'CC-BY-4.0' ? 'default' : 'outline'}
                  onClick={() => setLicense('CC-BY-4.0')}
                  className="flex-1"
                >
                  CC BY 4.0
                </Button>
                <Button
                  variant={license === 'private' ? 'default' : 'outline'}
                  onClick={() => setLicense('private')}
                  className="flex-1"
                >
                  {t('private', 'Private')}
                </Button>
              </div>
            </div>

            <div className="pt-2 text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>{t('estimated_time', 'Estimated Time')}:</span>
                <span>1 min</span>
              </div>
              <div className="flex justify-between">
                <span>{t('credits_cost', 'Credits Cost')}:</span>
                <span>20</span>
              </div>
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !imageUrl || !meshName}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('generating', 'Generating...')}
                </>
              ) : (
                <>
                  <Box className="h-4 w-4 mr-2" />
                  {t('generate', 'Generate')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Preview & Status */}
      <div className="space-y-6">
        <Card className="h-full min-h-[600px]">
          <CardHeader>
            <CardTitle>3D Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[calc(100%-80px)]">
            {isPolling && currentJob && (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <div>
                  <p className="font-medium">Processing: {currentJob.type}</p>
                  <p className="text-sm text-muted-foreground">Status: {currentJob.status}</p>
                </div>
              </div>
            )}
            
            {currentJob?.status === 'done' && (currentJob.output_data as any)?.output_url && (
              <div className="w-full space-y-4">
                <div className="bg-secondary rounded-lg p-8 text-center">
                  <Box className="h-24 w-24 mx-auto text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">3D Model Generated</p>
                </div>
                <Button asChild className="w-full">
                  <a href={(currentJob.output_data as any).output_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    {t('download_3d_model', 'Download 3D Model')}
                  </a>
                </Button>
              </div>
            )}

            {!currentJob && !isPolling && (
              <div className="text-center text-muted-foreground">
                <Box className="h-24 w-24 mx-auto mb-4 opacity-20" />
                <p>Choose a model to edit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
