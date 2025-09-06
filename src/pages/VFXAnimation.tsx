import { useState } from 'react';
import { Sparkles, Camera, Wand2, Palette, Play, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadZone } from '@/components/FileUploadZone';
import { MediaPreview } from '@/components/MediaPreview';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function VFXAnimation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: string}>({});
  
  // VFX Planning States
  const [sceneDescription, setSceneDescription] = useState('');
  const [trackingResults, setTrackingResults] = useState<any>(null);
  
  // Animation States
  const [characterType, setCharacterType] = useState('');
  const [rigComplexity, setRigComplexity] = useState('');
  const [rigResults, setRigResults] = useState<any>(null);
  
  // Color Grading States
  const [colorGradeStyle, setColorGradeStyle] = useState('');
  const [colorGradeResults, setColorGradeResults] = useState<any>(null);

  // Fetch VFX Assets
  const { data: vfxAssets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['vfx-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vfx_assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Handle file uploads for different purposes
  const handleFileUploaded = (url: string, file: File, purpose: string) => {
    setSelectedFiles(prev => ({ ...prev, [purpose]: url }));
    toast.success(`${file.name} uploaded successfully!`);
  };

  // Roto/Track Processing
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
          trackingType: 'object'
        }
      });

      if (error) throw error;
      
      setTrackingResults(data);
      toast.success('Roto/Track analysis completed!');
      
      // Create notification for completion
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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

  // Auto-Rigging
  const handleAutoRig = async () => {
    if (!characterType || !rigComplexity) {
      toast.error('Please select character type and rig complexity');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-rigger', {
        body: {
          characterType,
          rigComplexity,
          modelUrl: selectedFiles.model
        }
      });

      if (error) throw error;
      
      setRigResults(data);
      toast.success('Auto-rigging completed!');
      
      // Create notification for completion
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Auto-Rigging Complete',
          message: `${characterType} rig with ${rigComplexity} complexity has been generated successfully.`,
          type: 'success'
        });
      }
    } catch (error: any) {
      console.error('Auto-rigging error:', error);
      toast.error(`Failed to generate rig: ${error.message}`);
      
      // Create notification for error
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Auto-Rigging Failed',
          message: `Rig generation failed: ${error.message}`,
          type: 'error'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Color Grading
  const handleColorGrade = async () => {
    if (!selectedFiles.colorGradeMedia || !colorGradeStyle) {
      toast.error('Please upload media and select a color grading style');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('color-grade', {
        body: {
          imageUrl: selectedFiles.colorGradeMedia,
          prompt: `Apply ${colorGradeStyle} color grading style to this image. Enhance the cinematic look with professional color correction.`
        }
      });

      if (error) throw error;
      
      setColorGradeResults(data);
      toast.success('Color grading completed!');
      
      // Create notification for completion
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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
          <TabsTrigger value="roto">Roto/Track AI</TabsTrigger>
          <TabsTrigger value="rigging">Auto-Rigger</TabsTrigger>
          <TabsTrigger value="grading">Color Grade</TabsTrigger>
          <TabsTrigger value="assets">Asset Library</TabsTrigger>
        </TabsList>

        {/* Roto/Track AI Tab */}
        <TabsContent value="roto" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Video Input & Scene Analysis
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

        {/* Auto-Rigger Tab */}
        <TabsContent value="rigging" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Character Rigging Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="character-type">Character Type</Label>
                  <Select value={characterType} onValueChange={setCharacterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select character type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="humanoid">Humanoid</SelectItem>
                      <SelectItem value="creature">Creature/Animal</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rig-complexity">Rig Complexity</Label>
                  <Select value={rigComplexity} onValueChange={setRigComplexity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select complexity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple (Basic bones)</SelectItem>
                      <SelectItem value="standard">Standard (Full body)</SelectItem>
                      <SelectItem value="advanced">Advanced (Facial + Fingers)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Upload 3D Model (Optional)</Label>
                  <FileUploadZone
                    bucket="vfx-assets"
                    acceptedFileTypes={['*']}
                    maxSizeMB={100}
                    onFileUploaded={(url, file) => handleFileUploaded(url, file, 'model')}
                    className="mt-1"
                  />
                </div>

                <Button 
                  onClick={handleAutoRig} 
                  disabled={isProcessing || !characterType || !rigComplexity}
                  className="w-full"
                >
                  {isProcessing ? 'Generating Rig...' : 'Generate Auto-Rig'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rig Plan & Downloads</CardTitle>
              </CardHeader>
              <CardContent>
                {rigResults ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Rig Generated Successfully</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Character: {rigResults.metadata?.characterType}</div>
                        <div>Complexity: {rigResults.metadata?.rigComplexity}</div>
                        <div>Bones: {rigResults.rigPlan?.bones?.length || 0}</div>
                        <div>Controllers: {rigResults.rigPlan?.controllers?.length || 0}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Download Rig Files</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {rigResults.rigFiles?.blender && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={rigResults.rigFiles.blender} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Blender
                            </a>
                          </Button>
                        )}
                        {rigResults.rigFiles?.maya && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={rigResults.rigFiles.maya} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Maya
                            </a>
                          </Button>
                        )}
                        {rigResults.rigFiles?.unreal && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={rigResults.rigFiles.unreal} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Unreal
                            </a>
                          </Button>
                        )}
                        {rigResults.rigFiles?.unity && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={rigResults.rigFiles.unity} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Unity
                            </a>
                          </Button>
                        )}
                      </div>
                      {rigResults.rigFiles?.documentation && (
                        <Button variant="outline" size="sm" asChild className="w-full">
                          <a href={rigResults.rigFiles.documentation} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download Documentation
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Select character type and complexity to generate an auto-rig
                  </p>
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
                        type={selectedFiles.colorGradeMedia.includes('video') ? 'video' : 'image'} 
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
                    
                    {colorGradeResults.output && (
                      <div>
                        <Label>Graded Result</Label>
                        <MediaPreview url={colorGradeResults.output} type="image" />
                        <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                          <a href={colorGradeResults.output} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download Graded Image
                          </a>
                        </Button>
                      </div>
                    )}
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

        {/* VFX Asset Library Tab */}
        <TabsContent value="assets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>VFX Asset Library</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Upload VFX Assets</Label>
                  <FileUploadZone
                    bucket="vfx-assets"
                    acceptedFileTypes={['image', 'video']}
                    multiple={true}
                    maxSizeMB={100}
                    onFileUploaded={(url, file) => {
                      toast.success(`${file.name} uploaded to asset library!`);
                      // Refetch assets to update the list
                      window.location.reload();
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Your VFX Assets</Label>
                  {assetsLoading ? (
                    <p className="text-muted-foreground">Loading assets...</p>
                  ) : vfxAssets.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                      {vfxAssets.map((asset) => (
                        <div key={asset.id} className="p-3 border rounded-lg">
                          <MediaPreview 
                            url={asset.file_url} 
                            type={asset.file_type.startsWith('video') ? 'video' : 'image'}
                            className="mb-2"
                          />
                          <p className="text-sm font-medium truncate">{asset.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round((asset.file_size || 0) / 1024 / 1024 * 100) / 100} MB
                          </p>
                          <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                            <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No VFX assets uploaded yet. Upload some assets to get started!
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}