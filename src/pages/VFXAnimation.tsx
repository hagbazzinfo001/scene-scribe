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
import { ColorGradeControls } from '@/components/ColorGradeControls';
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

export default function VFXAnimation() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { startMonitoring } = useBackgroundProcessing();
  
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
      
      if (data.job_id) {
        startMonitoring(data.job_id, 'Roto/Track');
      }
      
      setTrackingResults(data);
      toast.success('Roto/Track analysis started!');
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
      const { data, error } = await supabase.functions.invoke('vfx-color-grade', {
        body: {
          imageUrl: selectedFiles.colorGradeMedia,
          projectId: projectId,
          gradeSettings: settings,
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (error) throw error;
      setColorGradeResults(data);
      toast.success('Color grading completed!');
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
            <Card>
              <CardHeader>
                <CardTitle>Roto Scoping Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Scene Description</Label>
                  <Textarea 
                    placeholder="Describe what to track (e.g., 'Track the actor's face')"
                    value={sceneDescription}
                    onChange={(e) => setSceneDescription(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>Upload Video</Label>
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
                  {isProcessing ? 'Processing...' : 'Start Roto/Track'}
                </Button>
              </CardContent>
            </Card>

            <RotoTrackingResults results={trackingResults} />
          </div>
        </TabsContent>

        {/* Mesh Tab */}
        <TabsContent value="mesh" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>3D Mesh Generation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Mesh Type</Label>
                  <Select value={meshType} onValueChange={setMeshType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mesh type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="character">Character</SelectItem>
                      <SelectItem value="prop">Prop</SelectItem>
                      <SelectItem value="environment">Environment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Complexity</Label>
                  <Select value={complexity} onValueChange={setComplexity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select complexity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleMeshGeneration}
                  disabled={isProcessing || !meshType || !complexity}
                  className="w-full"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Box className="h-4 w-4 mr-2" />}
                  {isProcessing ? 'Generating...' : 'Generate Mesh'}
                </Button>
              </CardContent>
            </Card>

            {meshResults && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Mesh</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <a href={meshResults.download_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download 3D Model
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Color Grading Tab */}
        <TabsContent value="grading" className="space-y-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Media for Color Grading</CardTitle>
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

            <ColorGradeControls 
              onApply={handleColorGrade}
              isProcessing={isProcessing}
            />

            {colorGradeResults && (
              <Card>
                <CardHeader>
                  <CardTitle>Graded Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <MediaPreview url={colorGradeResults.processed_image_url} type="image" />
                  <Button asChild className="w-full mt-2">
                    <a href={colorGradeResults.download_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Graded Image
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