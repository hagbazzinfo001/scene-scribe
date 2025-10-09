/* 
 * [VFX_ANIMATION] VFX & Animation Studio for Nollywood Productions
 * Core Features: [ROTO], [AUTO_RIGGER], [COLOR_GRADE], Asset Management
 * Market: Pan-African indie studios & students with budget-conscious workflows
 */

import { useState, useEffect } from 'react';
import { Sparkles, Camera, Wand2, Palette, Play, Download, FileText, Upload, Box, Loader2, Volume2, FilmIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadZone } from '@/components/FileUploadZone';
import { MediaPreview } from '@/components/MediaPreview';
import { ImportAssetDropzone } from '@/components/ImportAssetDropzone';
import { AssetLibrary } from '@/components/AssetLibrary';
import { RotoTrackingResults } from '@/components/RotoTrackingResults';
import { MeshGeneratorWorkspace } from '@/components/MeshGeneratorWorkspace';
import { RotoEditingWorkspace } from '@/components/RotoEditingWorkspace';
import { AdvancedColorGrading } from '@/components/AdvancedColorGrading';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { freeAIService } from '@/services/freeAIService';
import { openSourceVFX } from '@/services/openSourceVFX';
import { useTranslation } from 'react-i18next';
import { useBackgroundProcessing } from '@/hooks/useBackgroundProcessing';
import { useJobStatus } from '@/hooks/useJobStatus';

export default function VFXAnimation() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { startMonitoring } = useBackgroundProcessing();
  
  // Job status tracking
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { job: currentJob, isPolling } = useJobStatus(currentJobId);
  
  // [CORE_STATE] Main processing and file management states
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: string}>({});
  const [selectedTypes, setSelectedTypes] = useState<{[key: string]: string}>({});
  
  // [ROTO] VFX Planning States for Roto/Track AI
  const [sceneDescription, setSceneDescription] = useState('');
  const [trackingResults, setTrackingResults] = useState<any>(null);
  
  // [MESH_GENERATOR] 3D Mesh Generation States
  const [meshType, setMeshType] = useState('');
  const [complexity, setComplexity] = useState('');
  const [meshResults, setMeshResults] = useState<any>(null);
  
  // [COLOR_GRADE] Color Grading States
  const [colorGradeResults, setColorGradeResults] = useState<any>(null);

  // [FILE_MANAGEMENT] Handle file uploads
  const handleFileUploaded = async (url: string, file: File, purpose: string) => {
    setSelectedFiles(prev => ({ ...prev, [purpose]: url }));
    setSelectedTypes(prev => ({ ...prev, [purpose]: file.type || '' }));
    toast.success(`${file.name} uploaded successfully!`);
  };

  // [ROTO] Roto/Track Processing
  const handleRotoTrack = async () => {
    if (!selectedFiles.video || !sceneDescription.trim()) {
      toast.error('Please upload a video and provide a scene description');
      return;
    }

    setIsProcessing(true);
    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke('simple-roto', {
        body: {
          videoUrl: selectedFiles.video,
          projectId: projectId,
          description: sceneDescription.trim(),
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (error) throw error;
      
      if (data?.job_id) {
        setCurrentJobId(data.job_id);
        startMonitoring(data.job_id, 'Roto/Track');
        toast.success('Roto job queued! Processing in background...');
      } else {
        toast.error('Failed to create job');
      }
    } catch (error: any) {
      toast.error(`Failed to process video: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // [MESH_GENERATOR] 3D Mesh Generation
  const handleMeshGeneration = async () => {
    if (!meshType || !complexity) {
      toast.error('Please select mesh type and complexity');
      return;
    }

    setIsProcessing(true);
    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke('mesh-generator', {
        body: { project_id: projectId, mesh_type: meshType, complexity: complexity },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (error) throw error;
      setMeshResults(data);
      toast.success('Mesh generation completed!');
    } catch (error: any) {
      toast.error(`Failed to generate mesh: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // [COLOR_GRADE] Color Grading with Professional Controls
  const handleColorGrade = async (settings?: any) => {
    if (!selectedFiles.colorGradeMedia) {
      toast.error('Please upload media first');
      return;
    }

    setIsProcessing(true);
    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke('simple-color-grade', {
        body: {
          videoUrl: selectedFiles.colorGradeMedia,
          projectId: projectId,
          colorPreset: settings?.preset || 'cinematic',
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (error) throw error;
      
      if (data?.job_id) {
        setCurrentJobId(data.job_id);
        startMonitoring(data.job_id, 'Color Grading');
        toast.success('Color grading job queued! Processing in background...');
      } else {
        toast.error('Failed to create job');
      }
    } catch (error: any) {
      toast.error(`Failed to process color grading: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">VFX & Animation Studio</h1>
            <p className="text-muted-foreground">
              AI-powered visual effects and animation tools for Nollywood productions
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="roto" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roto">Roto Scoping</TabsTrigger>
          <TabsTrigger value="mesh">Mesh Generator</TabsTrigger>
          <TabsTrigger value="grading">Color Process</TabsTrigger>
          <TabsTrigger value="assets">Asset Library</TabsTrigger>
        </TabsList>

        {/* Roto Tab */}
        <TabsContent value="roto" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('roto_scoping_setup', 'Roto Scoping Setup')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Job Status Display */}
                  {isPolling && currentJob && currentJob.type === 'roto' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="font-medium text-blue-900">
                          Processing: Roto/Tracking
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        Status: {currentJob.status} - Job running in background
                      </p>
                    </div>
                  )}
                  
                  {currentJob?.status === 'done' && currentJob.type === 'roto' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-green-900">✓ {t('processing_complete', 'Processing Complete')}</span>
                      </div>
                      {(currentJob.output_data as any)?.output_url && (
                        <Button asChild className="w-full">
                          <a href={(currentJob.output_data as any).output_url} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            {t('download_processed_video', 'Download Processed Video')}
                          </a>
                        </Button>
                      )}
                    </div>
                  )}

                  <div>
                    <Label>{t('scene_description', 'Scene Description')}</Label>
                    <Textarea 
                      placeholder="Describe what to track (e.g., 'Track the actor's face')"
                      value={sceneDescription}
                      onChange={(e) => setSceneDescription(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>{t('upload_video', 'Upload Video')}</Label>
                    <FileUploadZone
                      bucket="video-uploads"
                      acceptedFileTypes={['video']}
                      maxSizeMB={500}
                      onFileUploaded={(url, file) => handleFileUploaded(url, file, 'video')}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleRotoTrack}
                    disabled={isProcessing || !selectedFiles.video || !sceneDescription}
                    className="w-full"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                    {isProcessing ? t('processing', 'Processing...') : t('start_roto_track', 'Start Roto/Track')}
                  </Button>
                </CardContent>
              </Card>

              <RotoEditingWorkspace 
                videoUrl={selectedFiles.video}
                onApplyEdits={(edits) => console.log('Roto edits:', edits)}
              />
            </div>

            <RotoTrackingResults results={trackingResults} />
          </div>
        </TabsContent>

        {/* Mesh Tab */}
        <TabsContent value="mesh" className="space-y-6">
          <MeshGeneratorWorkspace projectId={projectId} />
        </TabsContent>

        {/* Color Grading Tab */}
        <TabsContent value="grading" className="space-y-6">
          {/* Job Status Display for Color Grading */}
          {isPolling && currentJob && currentJob.type === 'color-grade' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="font-medium text-blue-900">
                  Processing: Color Grading
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Status: {currentJob.status} - Job running in background
              </p>
            </div>
          )}
          
            {currentJob?.status === 'done' && currentJob.type === 'color-grade' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-medium text-green-900">✓ {t('processing_complete', 'Processing Complete')}</span>
              </div>
              {(currentJob.output_data as any)?.output_url && (
                <>
                  <MediaPreview url={(currentJob.output_data as any).output_url} type="image" />
                  <Button asChild className="w-full mt-3">
                    <a href={(currentJob.output_data as any).output_url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      {t('download_graded_image', 'Download Graded Image')}
                    </a>
                  </Button>
                </>
              )}
            </div>
          )}
          
          <div className="space-y-6">
            <Card>
          <CardHeader>
            <CardTitle>{t('upload_media_color_grading', 'Upload Media for Color Grading')}</CardTitle>
          </CardHeader>
              <CardContent>
                <FileUploadZone
                  bucket="vfx-assets"
                  acceptedFileTypes={['image', 'video']}
                  maxSizeMB={100}
                  onFileUploaded={(url, file) => handleFileUploaded(url, file, 'colorGradeMedia')}
                />
                {selectedFiles.colorGradeMedia && (
                  <div className="mt-2">
                    <MediaPreview 
                      url={selectedFiles.colorGradeMedia} 
                      type={selectedTypes.colorGradeMedia?.startsWith('video') ? 'video' : 'image'}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <AdvancedColorGrading 
              onApply={handleColorGrade}
              isProcessing={isProcessing}
            />

            {colorGradeResults && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('graded_result', 'Graded Result')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <MediaPreview url={colorGradeResults.processed_image_url} type="image" />
                  <Button asChild className="w-full mt-2">
                    <a href={colorGradeResults.download_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      {t('download_graded_image', 'Download Graded Image')}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Asset Library Tab */}
        <TabsContent value="assets">
          <AssetLibrary 
            projectId={projectId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}