import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Play, Download, Settings, Loader2 } from 'lucide-react';

export function PluginWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activePlugin, setActivePlugin] = useState('script-breakdown');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Script Breakdown State
  const [scriptContent, setScriptContent] = useState('');
  const [breakdownDepth, setBreakdownDepth] = useState('normal');

  // Roto State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frameRange, setFrameRange] = useState({ start: 0, end: 100 });
  const [trackingDescription, setTrackingDescription] = useState('');
  const [maskTightness, setMaskTightness] = useState([50]);
  const [temporalSmoothing, setTemporalSmoothing] = useState([50]);
  const [outputFormat, setOutputFormat] = useState('video_with_alpha');

  // Audio Cleanup State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [preset, setPreset] = useState('light_denoise');
  const [aggression, setAggression] = useState([50]);

  // Color Grade State
  const [colorVideoFile, setColorVideoFile] = useState<File | null>(null);
  const [colorPreset, setColorPreset] = useState('filmic');
  const [exposure, setExposure] = useState([0]);
  const [contrast, setContrast] = useState([0]);
  const [saturation, setSaturation] = useState([100]);

  const handleFileUpload = async (file: File, bucket: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-signed-upload', {
        body: {
          bucket,
          name: file.name,
          contentType: file.type,
          project_id: null
        }
      });

      if (error) throw error;

      // Upload to signed URL
      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Confirm upload
      await supabase.functions.invoke('confirm-upload', {
        body: {
          bucket,
          path: data.path,
          fileId: data.fileId,
          mime: file.type,
          size: file.size
        }
      });

      return data.path;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const runScriptBreakdown = async () => {
    if (!scriptContent.trim()) {
      toast({
        title: "Missing Content",
        description: "Please provide script content",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('script-breakdown', {
        body: {
          script_content: scriptContent,
          depth: breakdownDepth
        }
      });

      if (error) throw error;

      setCurrentJob(data);
      toast({
        title: "Breakdown Complete",
        description: `Analyzed ${data.result?.scenes?.length || 0} scenes`
      });
    } catch (error) {
      toast({
        title: "Breakdown Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const runRotoTracking = async () => {
    if (!videoFile) {
      toast({
        title: "Missing File",
        description: "Please select a video file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const filePath = await handleFileUpload(videoFile, 'video-uploads');
      if (!filePath) throw new Error('File upload failed');

      const { data, error } = await supabase.functions.invoke('roto-tracking', {
        body: {
          file_path: filePath,
          frame_range: frameRange,
          description: trackingDescription,
          preset: 'track_person',
          tightness: maskTightness[0],
          smoothing: temporalSmoothing[0],
          output_format: outputFormat
        }
      });

      if (error) throw error;

      setCurrentJob(data);
      toast({
        title: "Tracking Complete",
        description: "Video tracking and masking is ready"
      });
    } catch (error) {
      toast({
        title: "Tracking Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const runAudioCleanup = async () => {
    if (!audioFile) {
      toast({
        title: "Missing File",
        description: "Please select an audio file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const filePath = await handleFileUpload(audioFile, 'audio-uploads');
      if (!filePath) throw new Error('File upload failed');

      const { data, error } = await supabase.functions.invoke('audio-cleanup', {
        body: {
          file_path: filePath,
          preset,
          aggression: aggression[0]
        }
      });

      if (error) throw error;

      setCurrentJob(data);
      toast({
        title: "Audio Cleanup Complete",
        description: "Cleaned audio is ready for download"
      });
    } catch (error) {
      toast({
        title: "Audio Cleanup Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const runColorGrade = async () => {
    if (!colorVideoFile) {
      toast({
        title: "Missing File",
        description: "Please select a video file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const filePath = await handleFileUpload(colorVideoFile, 'video-uploads');
      if (!filePath) throw new Error('File upload failed');

      const { data, error } = await supabase.functions.invoke('color-grade', {
        body: {
          file_path: filePath,
          preset: colorPreset,
          exposure: exposure[0],
          contrast: contrast[0],
          saturation: saturation[0]
        }
      });

      if (error) throw error;

      setCurrentJob(data);
      toast({
        title: "Color Grade Complete",
        description: "Graded video is ready for preview"
      });
    } catch (error) {
      toast({
        title: "Color Grade Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Plugin Workspace</h1>
      
      <Tabs value={activePlugin} onValueChange={setActivePlugin}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="script-breakdown">Script Breakdown</TabsTrigger>
          <TabsTrigger value="roto">Roto/Track</TabsTrigger>
          <TabsTrigger value="audio">Audio Cleanup</TabsTrigger>
          <TabsTrigger value="color">Color Grade</TabsTrigger>
        </TabsList>

        <TabsContent value="script-breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Script Breakdown AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="script-content">Script Content</Label>
                <Textarea
                  id="script-content"
                  placeholder="Paste your script content here..."
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
              
              <div>
                <Label>Analysis Depth</Label>
                <Select value={breakdownDepth} onValueChange={setBreakdownDepth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shallow">Shallow - Basic scenes and characters</SelectItem>
                    <SelectItem value="normal">Normal - Complete breakdown</SelectItem>
                    <SelectItem value="deep">Deep - Detailed analysis with props and locations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={runScriptBreakdown} 
                disabled={isProcessing || !scriptContent.trim()}
                className="w-full"
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Breakdown
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roto">
          <Card>
            <CardHeader>
              <CardTitle>Roto & Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Video File</Label>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Frame</Label>
                  <Input
                    type="number"
                    value={frameRange.start}
                    onChange={(e) => setFrameRange(prev => ({ ...prev, start: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>End Frame</Label>
                  <Input
                    type="number"
                    value={frameRange.end}
                    onChange={(e) => setFrameRange(prev => ({ ...prev, end: parseInt(e.target.value) || 100 }))}
                  />
                </div>
              </div>

              <div>
                <Label>Tracking Description</Label>
                <Textarea
                  placeholder="Describe what to track (e.g., 'Track the main actor and remove background')"
                  value={trackingDescription}
                  onChange={(e) => setTrackingDescription(e.target.value)}
                />
              </div>

              <div>
                <Label>Mask Tightness: {maskTightness[0]}</Label>
                <Slider
                  value={maskTightness}
                  onValueChange={setMaskTightness}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Temporal Smoothing: {temporalSmoothing[0]}</Label>
                <Slider
                  value={temporalSmoothing}
                  onValueChange={setTemporalSmoothing}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              <Button 
                onClick={runRotoTracking} 
                disabled={isProcessing || !videoFile}
                className="w-full"
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Tracking
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audio">
          <Card>
            <CardHeader>
              <CardTitle>Audio Cleanup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Audio File</Label>
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <Label>Preset</Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light_denoise">Light Denoise</SelectItem>
                    <SelectItem value="heavy_denoise">Heavy Denoise</SelectItem>
                    <SelectItem value="dialogue_enhance">Dialogue Enhance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Aggression: {aggression[0]}</Label>
                <Slider
                  value={aggression}
                  onValueChange={setAggression}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              <Button 
                onClick={runAudioCleanup} 
                disabled={isProcessing || !audioFile}
                className="w-full"
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Audio Cleanup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="color">
          <Card>
            <CardHeader>
              <CardTitle>Color Grade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Video File</Label>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setColorVideoFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <Label>Preset</Label>
                <Select value={colorPreset} onValueChange={setColorPreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filmic">Filmic</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cool">Cool</SelectItem>
                    <SelectItem value="nollywood">Nollywood Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Exposure: {exposure[0]}</Label>
                <Slider
                  value={exposure}
                  onValueChange={setExposure}
                  min={-3}
                  max={3}
                  step={0.1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Contrast: {contrast[0]}</Label>
                <Slider
                  value={contrast}
                  onValueChange={setContrast}
                  min={-100}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Saturation: {saturation[0]}</Label>
                <Slider
                  value={saturation}
                  onValueChange={setSaturation}
                  min={0}
                  max={200}
                  step={1}
                  className="mt-2"
                />
              </div>

              <Button 
                onClick={runColorGrade} 
                disabled={isProcessing || !colorVideoFile}
                className="w-full"
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Color Grade
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {currentJob && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Job ID:</strong> {currentJob.job_id}</p>
              <p><strong>Status:</strong> {currentJob.status || 'Completed'}</p>
              {currentJob.result && (
                <div className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(currentJob.result, null, 2)}
                  </pre>
                  {currentJob.result.output_url && (
                    <Button asChild className="mt-2">
                      <a href={currentJob.result.output_url} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download Result
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}