import { useState, useRef } from 'react';
import { Upload, Mic, Volume2, Download, Wand2, Settings, Play, Pause, AudioLines, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useJobStatus } from '@/hooks/useJobStatus';
import { useTranslation } from 'react-i18next';

export default function AudioCleanup() {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [noiseReduction, setNoiseReduction] = useState([70]);
  const [voiceEnhancement, setVoiceEnhancement] = useState([80]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sampleRate, setSampleRate] = useState(48000);
  const [bitDepth, setBitDepth] = useState(24);
  const [outputFormat, setOutputFormat] = useState('wav');
  const [processingMode, setProcessingMode] = useState('standard');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const { uploadFile } = useFileUpload();
  const { job: currentJob, isPolling } = useJobStatus(currentJobId);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
        toast.success('Audio file selected');
      } else {
        toast.error('Please select an audio file');
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
        setAudioFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const processAudio = async () => {
    if (!audioFile) {
      toast.error('Please select or record an audio file first');
      return;
    }

    setIsProcessing(true);
    try {
      // Upload audio file to storage
      const audioUrl = await uploadFile(audioFile, 'audio-uploads');
      if (!audioUrl) {
        throw new Error('Failed to upload audio file');
      }

      console.log('Uploaded audio URL:', audioUrl);

      // Call simple-audio-clean function to create job
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke('simple-audio-clean', {
        body: {
          audioUrl: audioUrl,
          projectId: null,
          preset: processingMode
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (error) throw error;

      if (data?.job_id) {
        setCurrentJobId(data.job_id);
        toast.success('Audio cleanup job queued! Processing in background...');
      } else {
        toast.error('Failed to create job');
      }

    } catch (error: any) {
      console.error('Audio processing error:', error);
      toast.error(`Processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const downloadProcessedAudio = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch audio');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `cleaned-audio-${Date.now()}.${outputFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download completed');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed - trying direct link');
      // Fallback to direct link
      window.open(url, '_blank');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <AudioLines className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">{t('audio_cleanup')}</h1>
          <p className="text-muted-foreground">{t('ai_audio_enhancement')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Processing Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload Audio</TabsTrigger>
              <TabsTrigger value="record">Record Live</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Audio File
                  </CardTitle>
                  <CardDescription>
                    Upload your audio file for AI-powered cleanup and enhancement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      {audioFile ? audioFile.name : 'Click to upload audio file'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports MP3, WAV, FLAC, M4A, and more
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="audio/*"
                    className="hidden"
                  />
                  
                  {audioFile && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">{audioFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Size: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="record" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    Live Audio Recording
                  </CardTitle>
                  <CardDescription>
                    Record audio directly from your microphone
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-4">
                    <div className={`w-32 h-32 mx-auto rounded-full border-4 flex items-center justify-center ${
                      isRecording ? 'border-red-500 bg-red-50' : 'border-muted-foreground bg-muted'
                    }`}>
                      <Mic className={`h-12 w-12 ${isRecording ? 'text-red-500' : 'text-muted-foreground'}`} />
                    </div>
                    
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      variant={isRecording ? "destructive" : "default"}
                      size="lg"
                    >
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                    
                    {isRecording && (
                      <Badge variant="destructive" className="animate-pulse">
                        Recording...
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Advanced Settings
                  </CardTitle>
                  <CardDescription>
                    Configure audio processing parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sampleRate">Sample Rate (Hz)</Label>
                      <Input
                        id="sampleRate"
                        type="number"
                        value={sampleRate}
                        onChange={(e) => setSampleRate(Number(e.target.value))}
                        placeholder="48000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bitDepth">Bit Depth</Label>
                      <Input
                        id="bitDepth"
                        type="number"
                        value={bitDepth}
                        onChange={(e) => setBitDepth(Number(e.target.value))}
                        placeholder="24"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="outputFormat">Output Format</Label>
                    <select
                      id="outputFormat"
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="wav">WAV</option>
                      <option value="mp3">MP3</option>
                      <option value="flac">FLAC</option>
                      <option value="aac">AAC</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processingMode">Processing Mode</Label>
                    <select
                      id="processingMode"
                      value={processingMode}
                      onChange={(e) => setProcessingMode(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="standard">Standard</option>
                      <option value="aggressive">Aggressive</option>
                      <option value="gentle">Gentle</option>
                      <option value="music">Music Optimized</option>
                      <option value="voice">Voice Optimized</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Job Status Display */}
          {isPolling && currentJob && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Processing Audio
                </CardTitle>
                <CardDescription>
                  Status: {currentJob.status} - Job running in background
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          
          {/* Processing Results */}
          {currentJob?.status === 'done' && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Complete</CardTitle>
                <CardDescription>Your audio has been successfully cleaned and enhanced</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(currentJob.output_data as any)?.output_url && (
                  <>
                    <div className="flex items-center gap-4">
                      <Button onClick={togglePlayback} variant="outline" size="sm">
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isPlaying ? 'Pause' : 'Play'}
                      </Button>
                      <Button 
                        onClick={() => downloadProcessedAudio((currentJob.output_data as any).output_url)} 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Cleaned Audio
                      </Button>
                      <Button onClick={() => { setCurrentJobId(null); setAudioFile(null); setIsPlaying(false); }} variant="outline" size="sm">
                        Reset
                      </Button>
                    </div>
                    <audio
                      ref={audioRef}
                      src={(currentJob.output_data as any).output_url}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full"
                      controls
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}
          
          {currentJob?.status === 'failed' && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900">Processing Failed</CardTitle>
                <CardDescription className="text-red-700">
                  {(currentJob as any).error_message || 'Unknown error occurred'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCurrentJobId(null)} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Processing Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Processing Options</CardTitle>
              <CardDescription>Configure AI enhancement settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    Noise Reduction: {noiseReduction[0]}%
                  </Label>
                  <Slider
                    value={noiseReduction}
                    onValueChange={setNoiseReduction}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove background noise and unwanted artifacts
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Voice Enhancement: {voiceEnhancement[0]}%
                  </Label>
                  <Slider
                    value={voiceEnhancement}
                    onValueChange={setVoiceEnhancement}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enhance vocal clarity and presence
                  </p>
                </div>
              </div>

              <Button 
                onClick={processAudio} 
                disabled={!audioFile || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Clean Audio'
                )}
              </Button>

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={45} className="w-full" />
                  <p className="text-xs text-center text-muted-foreground">
                    AI is processing your audio...
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