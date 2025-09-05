import { useState } from 'react';
import { Upload, Mic, Volume2, Download, Wand2, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

export default function AudioCleanup() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [noiseReduction, setNoiseReduction] = useState([50]);
  const [enhanceVoice, setEnhanceVoice] = useState([70]);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Volume2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Audio Cleanup</h1>
            <p className="text-muted-foreground">
              AI-powered audio enhancement using OpenAI Whisper, RNNoise, and FFmpeg
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload Audio</TabsTrigger>
          <TabsTrigger value="record">Record Live</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Audio File
                </CardTitle>
                <CardDescription>
                  Support for WAV, MP3, M4A, and other common audio formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <Label htmlFor="audio-upload" className="cursor-pointer">
                      <div className="text-sm">
                        <span className="text-primary font-medium">Click to upload</span> or drag and drop
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        WAV, MP3, M4A (Max 100MB)
                      </div>
                    </Label>
                    <Input
                      id="audio-upload"
                      type="file"
                      className="hidden"
                      accept="audio/*"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Processing Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Processing Options
                </CardTitle>
                <CardDescription>
                  Configure AI enhancement settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Noise Reduction: {noiseReduction[0]}%</Label>
                  <Slider
                    value={noiseReduction}
                    onValueChange={setNoiseReduction}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Voice Enhancement: {enhanceVoice[0]}%</Label>
                  <Slider
                    value={enhanceVoice}
                    onValueChange={setEnhanceVoice}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <Button 
                  className="w-full" 
                  disabled={isProcessing}
                  onClick={() => setIsProcessing(true)}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Start Processing
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
              <CardDescription>
                Before and after audio comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Original Audio</Label>
                  <div className="p-4 border rounded-lg text-center text-muted-foreground">
                    No audio uploaded yet
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Enhanced Audio</Label>
                  <div className="p-4 border rounded-lg text-center text-muted-foreground">
                    Process audio to see results
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="record" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Live Recording
              </CardTitle>
              <CardDescription>
                Record audio directly for real-time processing
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Mic className="h-12 w-12 text-primary" />
                </div>
              </div>
              <Button size="lg" className="px-8">
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Click to start recording. Audio will be processed in real-time.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Audio Processing Settings
              </CardTitle>
              <CardDescription>
                Configure advanced processing parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sample Rate</Label>
                  <Input defaultValue="44100" />
                </div>
                <div className="space-y-2">
                  <Label>Bit Depth</Label>
                  <Input defaultValue="16" />
                </div>
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Input defaultValue="WAV" />
                </div>
                <div className="space-y-2">
                  <Label>Processing Mode</Label>
                  <Input defaultValue="High Quality" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}