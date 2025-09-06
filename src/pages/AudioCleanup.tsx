import { useState, useRef } from 'react';
import { Upload, Mic, Volume2, Download, Wand2, Settings, Play, Pause, AudioLines } from 'lucide-react';
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
import { useStorage } from '@/hooks/useStorage';

export default function AudioCleanup() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [noiseReduction, setNoiseReduction] = useState([70]);
  const [voiceEnhancement, setVoiceEnhancement] = useState([80]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [sampleRate, setSampleRate] = useState(48000);
  const [bitDepth, setBitDepth] = useState(24);
  const [outputFormat, setOutputFormat] = useState('wav');
  const [processingMode, setProcessingMode] = useState('standard');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const { uploadFile, uploads } = useStorage();

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
      // Upload audio file to storage with proper error handling
      const audioUrl = await uploadFile(audioFile, 'audio-uploads');
      if (!audioUrl) {
        throw new Error('Failed to upload audio file - please check your connection and try again');
      }

      console.log('Uploaded audio URL:', audioUrl);

      // Call Replicate audio cleanup function
      const { data, error } = await supabase.functions.invoke('audio-cleanup', {
        body: {
          audioUrl,
          duration: 10,
          topK: 250,
          topP: 0.0,
          temperature: 1.0,
          classifierFreeGuidance: 3.0,
          outputFormat: outputFormat,
          normalizationStrategy: 'loudness',
          noiseReduction: noiseReduction[0] / 100,
          voiceEnhancement: voiceEnhancement[0] / 100,
          sampleRate,
          bitDepth,
          processingMode
        }
      });

      if (error) {
        throw error;
      }

      console.log('Audio processing result:', data);

      if (data?.output) {
        const out = Array.isArray(data.output)
          ? data.output[0]
          : (typeof data.output === 'object' && data.output?.audio)
            ? data.output.audio
            : (data.output.url || data.output);
        if (!out) throw new Error('No valid output URL returned');
        setProcessedAudioUrl(out);
        toast.success('Audio processing completed!');
      } else {
        throw new Error('No processed audio returned');
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

  const downloadProcessedAudio = async () => {
    if (processedAudioUrl) {
      try {
        const response = await fetch(processedAudioUrl);
        if (!response.ok) throw new Error('Failed to fetch audio');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cleaned-audio-${Date.now()}.${outputFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Download completed');
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Download failed - trying direct link');
        // Fallback to direct link
        window.open(processedAudioUrl, '_blank');
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <AudioLines className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Audio Cleanup</h1>
          <p className="text-muted-foreground">AI-powered audio enhancement and noise reduction</p>
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

          {/* Processing Results */}
          {processedAudioUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Complete</CardTitle>
                <CardDescription>Your audio has been successfully cleaned and enhanced</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button onClick={togglePlayback} variant="outline" size="sm">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  <Button onClick={downloadProcessedAudio} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Download className="h-4 w-4 mr-2" />
                    Download Cleaned Audio
                  </Button>
                </div>
                <audio
                  ref={audioRef}
                  src={processedAudioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full"
                  controls
                />
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
                {isProcessing ? 'Processing...' : 'Clean Audio'}
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

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Upload Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {uploads.map((upload, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{upload.file.name}</span>
                      <Badge variant={
                        upload.status === 'completed' ? 'default' :
                        upload.status === 'error' ? 'destructive' : 'secondary'
                      }>
                        {upload.status}
                      </Badge>
                    </div>
                    <Progress value={upload.progress} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}