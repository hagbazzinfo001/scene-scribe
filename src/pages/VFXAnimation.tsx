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
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

export default function VFXAnimation() {
  const { projectId } = useParams();
  const { user } = useAuth();
  
  // [CORE_STATE] Main processing and file management states
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: string}>({});
  const [selectedTypes, setSelectedTypes] = useState<{[key: string]: string}>({});
  const [projectAssets, setProjectAssets] = useState<any[]>([]);
  
  // [ROTO] VFX Planning States for Roto/Track AI
  const [sceneDescription, setSceneDescription] = useState('');
  const [trackingResults, setTrackingResults] = useState<any>(null);
  
  // [MESH_GENERATOR] 3D Mesh Generation States
  const [meshType, setMeshType] = useState('');
  const [complexity, setComplexity] = useState('');
  const [meshDescription, setMeshDescription] = useState('');
  const [meshResults, setMeshResults] = useState<any>(null);
  
  // [COLOR_GRADE] Color Grading States
  const [colorGradeStyle, setColorGradeStyle] = useState('');
  const [colorGradeResults, setColorGradeResults] = useState<any>(null);

  // [STORAGE_INTEGRATION] Fetch project assets and persist across sessions
  const { data: vfxAssets = [], isLoading: assetsLoading, refetch: refetchAssets } = useQuery({
    queryKey: ['vfx-assets', projectId],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .in('file_type', ['video', 'audio', 'image', 'model'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // [PERSISTENT_STORAGE] Load project files on component mount
  useEffect(() => {
    const loadProjectFiles = async () => {
      if (!user || !projectId) return;
      
      try {
        const { data: assets, error } = await supabase
          .from('user_assets')
          .select('*')
          .eq('user_id', user.id)
          .eq('project_id', projectId)
          .eq('processing_status', 'completed');
        
        if (error) throw error;
        
        setProjectAssets(assets || []);
        
        // Auto-populate last used files for each type
        const lastFiles: {[key: string]: string} = {};
        const lastTypes: {[key: string]: string} = {};
        
        assets?.forEach(asset => {
          if (asset.file_type === 'video' && !lastFiles.video) {
            lastFiles.video = asset.file_url;
            lastTypes.video = asset.mime_type;
          } else if (asset.file_type === 'model' && !lastFiles.model) {
            lastFiles.model = asset.file_url;
            lastTypes.model = asset.mime_type;
          } else if (asset.file_type === 'image' && !lastFiles.colorGradeMedia) {
            lastFiles.colorGradeMedia = asset.file_url;
            lastTypes.colorGradeMedia = asset.mime_type;
          }
        });
        
        setSelectedFiles(lastFiles);
        setSelectedTypes(lastTypes);
        
      } catch (error) {
        console.error('Error loading project files:', error);
      }
    };
    
    loadProjectFiles();
  }, [user, projectId]);

  // [FILE_MANAGEMENT] Handle file uploads with persistent storage
  const handleFileUploaded = async (url: string, file: File, purpose: string) => {
    setSelectedFiles(prev => ({ ...prev, [purpose]: url }));
    setSelectedTypes(prev => ({ ...prev, [purpose]: file.type || '' }));
    
    // Store asset in database for persistence
    try {
      const fileType = file.type.startsWith('video') ? 'video' : 
                      file.type.startsWith('image') ? 'image' : 
                      file.type.startsWith('audio') ? 'audio' : 'model';
      
      await supabase.from('user_assets').insert({
        user_id: user?.id,
        project_id: projectId || null,
        filename: file.name,
        file_url: url,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        storage_path: `${purpose}/${file.name}`,
        processing_status: 'completed'
      });
      
      refetchAssets();
      toast.success(`${file.name} uploaded and saved to project!`);
    } catch (error) {
      console.error('Error saving asset:', error);
      toast.success(`${file.name} uploaded successfully!`);
    }
  };

  // [ASSET_IMPORT] Handle asset import from dropzone
  const handleAssetUploaded = (assetId: string) => {
    refetchAssets();
    toast.success('Asset imported and analyzed successfully!');
  };

  // [ROTO] Roto/Track Processing - Real Replicate integration for video tracking
  const handleRotoTrack = async () => {
    if (!selectedFiles.video || !sceneDescription.trim()) {
      toast.error('Please upload a video and provide a scene description');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('roto-tracker', {
        body: {
          videoUrl: selectedFiles.video,
          sceneDescription: sceneDescription.trim(),
          trackingType: 'object',
          projectId: projectId
        }
      });

      if (error) throw error;
      
      setTrackingResults(data);
      
      // Save results to project assets for retrieval
      if (data.videoUrl) {
        await supabase.from('user_assets').insert({
          user_id: user?.id,
          project_id: projectId || null,
          filename: `roto_tracked_${Date.now()}.mp4`,
          file_url: data.videoUrl,
          file_type: 'video',
          storage_path: `roto-results/${Date.now()}`,
          metadata: { 
            originalVideo: selectedFiles.video,
            sceneDescription,
            trackingPoints: data.trackingPoints?.length || 0
          },
          processing_status: 'completed'
        });
      }
      
      toast.success('Roto/Track analysis completed!');
      
      // Create notification for completion
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Roto/Track Complete',
          message: `Video tracking for "${sceneDescription}" has been completed successfully.`,
          type: 'success'
        });
      }
    } catch (error: any) {
      console.error('Roto/Track error:', error);
      toast.error(`Failed to process video: ${error.message}`);
      
      // Create notification for error
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Roto/Track Failed',
          message: `Video tracking failed: ${error.message}`,
          type: 'error'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // [MESH_GENERATOR] 3D Mesh Generation with Replicate
  const handleMeshGeneration = async () => {
    if (!meshType || !complexity) {
      toast.error('Please select mesh type and complexity');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('mesh-generator', {
        body: {
          project_id: projectId,
          mesh_type: meshType,
          complexity: complexity
        }
      });

      if (error) throw error;
      
      setMeshResults(data);
      
      // Save mesh files to project assets for retrieval
      if (data.download_url) {
        await supabase.from('user_assets').insert({
          user_id: user?.id,
          project_id: projectId || null,
          filename: `mesh_${meshType}_${complexity}_${Date.now()}.obj`,
          file_url: data.download_url,
          file_type: 'model',
          storage_path: `meshes/${meshType}/${Date.now()}`,
          metadata: { 
            meshType,
            complexity,
            vertices: data.mesh_data?.vertices || 0,
            faces: data.mesh_data?.faces || 0,
            materials: data.mesh_data?.materials || [],
            downloadFormats: data.mesh_data?.download_formats || []
          },
          processing_status: 'completed'
        });
      }
      
      toast.success('Mesh generation completed!');
      
      // Create notification for completion
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Mesh Generation Complete',
          message: `${meshType} mesh with ${complexity} complexity has been generated successfully.`,
          type: 'success'
        });
      }
    } catch (error: any) {
      console.error('Mesh generation error:', error);
      toast.error(`Failed to generate mesh: ${error.message}`);
      
      // Create notification for error
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Mesh Generation Failed',
          message: `Mesh generation failed: ${error.message}`,
          type: 'error'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // [COLOR_GRADE] Color Grading - Real Replicate color grading with tweakable options
  const handleColorGrade = async () => {
    if (!selectedFiles.colorGradeMedia || !colorGradeStyle) {
      toast.error('Please upload media and select a color grading style');
      return;
    }

    setIsProcessing(true);
    try {
      let data, error;
      const isVideo = selectedTypes.colorGradeMedia?.startsWith('video');
      
      if (isVideo) {
        ({ data, error } = await supabase.functions.invoke('vfx-color-grade', {
          body: {
            project_id: projectId,
            video_path: selectedFiles.colorGradeMedia,
            style_reference: colorGradeStyle,
            options: {
              contrast: 1.2,
              saturation: 1.1,
              brightness: 1.0,
              temperature: 0,
              tint: 0
            }
          }
        }));
      } else {
        ({ data, error } = await supabase.functions.invoke('color-grade', {
          body: {
            imageUrl: selectedFiles.colorGradeMedia,
            prompt: `Apply ${colorGradeStyle} color grading style to this image. Enhance the cinematic look with professional color correction, vibrant colors, and balanced exposure.`
          }
        }));
      }

      if (error) throw error;
      
      setColorGradeResults(data);
      
      // Save graded media to project assets for retrieval
      const gradedUrl = data.output || data.output_data?.graded_video_url;
      if (gradedUrl) {
        await supabase.from('user_assets').insert({
          user_id: user?.id,
          project_id: projectId || null,
          filename: `color_graded_${colorGradeStyle}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          file_url: gradedUrl,
          file_type: isVideo ? 'video' : 'image',
          storage_path: `color-graded/${colorGradeStyle}/${Date.now()}`,
          metadata: { 
            originalMedia: selectedFiles.colorGradeMedia,
            style: colorGradeStyle,
            isVideo: isVideo
          },
          processing_status: 'completed'
        });
      }
      
      toast.success('Color grading completed!');
      
      // Create notification for completion
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Color Grading Complete',
          message: `${colorGradeStyle} color grading has been applied successfully.`,
          type: 'success'
        });
      }
    } catch (error: any) {
      console.error('Color grading error:', error);
      toast.error(`Failed to process color grading: ${error.message}`);
      
      // Create notification for error
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Color Grading Failed',
          message: `Color grading failed: ${error.message}`,
          type: 'error'
        });
      }
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

        {/* Roto Scoping Tab */}
        <TabsContent value="roto" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Roto Scoping Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="scene-description">Scene Description</Label>
                  <Textarea 
                    id="scene-description"
                    placeholder="Describe what to track (e.g., 'Track the actor's face', 'Follow the moving car')"
                    value={sceneDescription}
                    onChange={(e) => setSceneDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Upload Video File</Label>
                  <FileUploadZone
                    bucket="video-uploads"
                    acceptedFileTypes={['video']}
                    maxSizeMB={500}
                    onFileUploaded={(url, file) => handleFileUploaded(url, file, 'video')}
                    className="mt-1"
                  />
                  {selectedFiles.video && (
                    <div className="mt-2">
                      <MediaPreview url={selectedFiles.video} type="video" />
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleRotoTrack} 
                  disabled={isProcessing || !selectedFiles.video || !sceneDescription.trim()}
                  className="w-full"
                >
                  {isProcessing ? 'Processing...' : 'Start Tracking Analysis'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tracking Results</CardTitle>
              </CardHeader>
              <CardContent>
                {trackingResults ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Analysis Complete</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Scene: {trackingResults.metadata?.sceneDescription}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Frame Count: {trackingResults.metadata?.frameCount || 'N/A'}</div>
                        <div>Resolution: {trackingResults.metadata?.resolution || 'N/A'}</div>
                        <div>Duration: {trackingResults.metadata?.duration || 'N/A'}s</div>
                        <div>Tracking Points: {trackingResults.trackingPoints?.length || 0}</div>
                      </div>
                    </div>
                    
                    {trackingResults.videoUrl && (
                      <div>
                        <Label>Processed Video with Tracking</Label>
                        <MediaPreview url={trackingResults.videoUrl} type="video" />
                        <Button variant="outline" size="sm" className="mt-2 w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Download Tracking Data
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Upload a video and provide scene description to begin tracking analysis
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Mesh Generator Tab */}
        <TabsContent value="mesh" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  3D Mesh Generator
                </CardTitle>
                <p className="text-sm text-muted-foreground">Generate 3D models and props using AI</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mesh-type">Mesh Type</Label>
                  <Select value={meshType} onValueChange={setMeshType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mesh type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="character">Character</SelectItem>
                      <SelectItem value="prop">Prop/Object</SelectItem>
                      <SelectItem value="environment">Environment</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="complexity">Detail Level</Label>
                  <Select value={complexity} onValueChange={setComplexity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select detail level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (1K vertices)</SelectItem>
                      <SelectItem value="medium">Medium (5K vertices)</SelectItem>
                      <SelectItem value="high">High (15K vertices)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Mesh Description</Label>
                  <textarea 
                    className="w-full p-3 border rounded-md resize-none"
                    rows={3}
                    placeholder="Describe the 3D model you want to generate (e.g., 'A medieval knight sword with ornate handle')"
                    value={meshDescription}
                    onChange={(e) => setMeshDescription(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Reference Image (Optional)</Label>
                  <FileUploadZone
                    bucket="vfx-assets"
                    acceptedFileTypes={['jpg', 'jpeg', 'png', 'webp']}
                    maxSizeMB={10}
                    onFileUploaded={(url, file) => handleFileUploaded(url, file, 'image')}
                    className="mt-1"
                  />
                </div>

                <Button 
                  onClick={handleMeshGeneration} 
                  disabled={isProcessing || !meshType || !complexity || !meshDescription}
                  className="w-full"
                >
                  {isProcessing ? 'Generating 3D Mesh...' : 'Generate 3D Mesh'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated Mesh & Downloads</CardTitle>
              </CardHeader>
              <CardContent>
                {meshResults ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">3D Mesh Generated Successfully</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Type: {meshResults.mesh_data?.type || meshType}</div>
                        <div>Detail: {meshResults.mesh_data?.complexity || complexity}</div>
                        <div>Vertices: {meshResults.mesh_data?.vertices?.toLocaleString() || 0}</div>
                        <div>Faces: {meshResults.mesh_data?.faces?.toLocaleString() || 0}</div>
                      </div>
                      {meshResults.mesh_data?.materials && (
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground">Materials: {meshResults.mesh_data.materials.join(', ')}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Download 3D Model Files</Label>
                      
                      {/* Primary download */}
                      {meshResults.download_url && (
                        <Button variant="outline" className="w-full" asChild>
                          <a href={meshResults.download_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download 3D Model (.obj)
                          </a>
                        </Button>
                      )}
                      
                      {/* Format-specific downloads */}
                      <div className="grid grid-cols-2 gap-2">
                        {meshResults.mesh_data?.download_formats?.includes('fbx') && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`${meshResults.download_url}?format=fbx`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              FBX
                            </a>
                          </Button>
                        )}
                        {meshResults.mesh_data?.download_formats?.includes('blend') && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`${meshResults.download_url}?format=blend`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Blender
                            </a>
                          </Button>
                        )}
                        {meshResults.mesh_data?.download_formats?.includes('maya') && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`${meshResults.download_url}?format=maya`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Maya
                            </a>
                          </Button>
                        )}
                        {meshResults.mesh_data?.download_formats?.includes('unreal') && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`${meshResults.download_url}?format=unreal`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Unreal
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Box className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      Configure mesh type and description to generate a 3D model
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Color Grading Tab */}
        <TabsContent value="grading" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  AI Color Grading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="grading-style">Color Grading Style</Label>
                  <Select value={colorGradeStyle} onValueChange={setColorGradeStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grading style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="warm-tone">Warm Tone</SelectItem>
                      <SelectItem value="cool-tone">Cool Tone</SelectItem>
                      <SelectItem value="vintage">Vintage</SelectItem>
                      <SelectItem value="noir">Film Noir</SelectItem>
                      <SelectItem value="vibrant">Vibrant</SelectItem>
                      <SelectItem value="desaturated">Desaturated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Upload Image/Video</Label>
                  <FileUploadZone
                    bucket="vfx-assets"
                    acceptedFileTypes={['image', 'video']}
                    maxSizeMB={200}
                    onFileUploaded={(url, file) => handleFileUploaded(url, file, 'colorGradeMedia')}
                    className="mt-1"
                  />
                  {selectedFiles.colorGradeMedia && (
                    <div className="mt-2">
                      <MediaPreview 
                        url={selectedFiles.colorGradeMedia} 
                        type={selectedTypes.colorGradeMedia?.startsWith('video') ? 'video' : 'image'} 
                      />
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleColorGrade} 
                  disabled={isProcessing || !selectedFiles.colorGradeMedia || !colorGradeStyle}
                  className="w-full"
                >
                  {isProcessing ? 'Processing...' : 'Apply Color Grading'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Graded Result</CardTitle>
              </CardHeader>
              <CardContent>
                {colorGradeResults ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Color Grading Applied</h4>
                      <p className="text-sm text-muted-foreground">
                        Style: {colorGradeStyle}
                      </p>
                    </div>
                    
                      {colorGradeResults.graded_video_url || colorGradeResults.preview_url ? (
                        <div>
                          <Label>Graded Video</Label>
                          <MediaPreview url={colorGradeResults.preview_url || colorGradeResults.graded_video_url} type="video" />
                          <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                            <a href={colorGradeResults.graded_video_url || colorGradeResults.preview_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Download Graded Video
                            </a>
                          </Button>
                        </div>
                      ) : colorGradeResults.output ? (
                        <div>
                          <Label>Graded Result</Label>
                          <MediaPreview url={(Array.isArray(colorGradeResults.output) ? colorGradeResults.output[0] : colorGradeResults.output)} type="image" />
                          <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                            <a href={(Array.isArray(colorGradeResults.output) ? colorGradeResults.output[0] : colorGradeResults.output)} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Download Graded Image
                            </a>
                          </Button>
                        </div>
                      ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Upload media and select a style to apply AI color grading
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* [ASSET_LIBRARY] Asset Library Tab - Persistent storage with retrieval */}
        <TabsContent value="assets" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assetsLoading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading VFX assets...</p>
              </div>
            ) : vfxAssets.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">
                  No VFX assets found. Upload files using the Import tab to build your asset library.
                </p>
              </div>
            ) : (
              vfxAssets.map((asset) => (
                <Card key={asset.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate">{asset.filename}</h4>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {asset.file_type}
                      </span>
                    </div>
                    
                    {/* Show file preview for images/videos */}
                    {asset.file_url && (asset.file_type === 'image' || asset.file_type === 'video') && (
                      <div className="mb-3">
                        <MediaPreview 
                          url={asset.file_url} 
                          type={asset.file_type} 
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      <div>Size: {Math.round((asset.file_size || 0) / 1024)}KB</div>
                      <div>Type: {asset.mime_type || asset.file_type}</div>
                      <div>Status: {asset.processing_status}</div>
                      <div>Created: {new Date(asset.created_at).toLocaleDateString()}</div>
                      {asset.metadata && Object.keys(asset.metadata).length > 0 && (
                        <div>Metadata: {Object.keys(asset.metadata).length} fields</div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => {
                          const purpose = asset.file_type === 'video' ? 'video' : 
                                        asset.file_type === 'image' ? 'colorGradeMedia' : 'model';
                          setSelectedFiles(prev => ({ ...prev, [purpose]: asset.file_url }));
                          setSelectedTypes(prev => ({ ...prev, [purpose]: asset.mime_type || asset.file_type }));
                          toast.success(`${asset.filename} loaded for use!`);
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <a href={asset.file_url} download>
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}