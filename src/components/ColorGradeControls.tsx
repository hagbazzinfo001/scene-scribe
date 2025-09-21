import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Palette, Sun, Contrast, Zap, Film, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ColorGradeControlsProps {
  onApply: (settings: ColorGradeSettings) => void;
  isProcessing?: boolean;
}

export interface ColorGradeSettings {
  style: string;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  vibrance: number;
  saturation: number;
  temperature: number;
  tint: number;
  lut?: string;
}

const DEFAULT_SETTINGS: ColorGradeSettings = {
  style: 'cinematic',
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  vibrance: 0,
  saturation: 0,
  temperature: 0,
  tint: 0
};

const PRESET_STYLES = [
  { id: 'cinematic', name: 'Cinematic', icon: Film, description: 'Professional film look' },
  { id: 'warm-tone', name: 'Warm Tone', icon: Sun, description: 'Golden hour warmth' },
  { id: 'cool-tone', name: 'Cool Tone', icon: Zap, description: 'Blue/teal cinema style' },
  { id: 'vintage', name: 'Vintage', icon: Timer, description: 'Retro film aesthetic' },
  { id: 'high-contrast', name: 'High Contrast', icon: Contrast, description: 'Bold dramatic look' },
  { id: 'natural', name: 'Natural', icon: Palette, description: 'Balanced natural tones' }
];

export function ColorGradeControls({ onApply, isProcessing = false }: ColorGradeControlsProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ColorGradeSettings>(DEFAULT_SETTINGS);

  const updateSetting = (key: keyof ColorGradeSettings, value: number | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (presetId: string) => {
    const presets: Record<string, Partial<ColorGradeSettings>> = {
      'cinematic': { exposure: 0.2, contrast: 0.3, highlights: -0.2, shadows: 0.1, vibrance: 0.2, temperature: 100 },
      'warm-tone': { exposure: 0.1, contrast: 0.1, highlights: -0.1, shadows: 0.2, temperature: 200, tint: 50 },
      'cool-tone': { exposure: 0, contrast: 0.2, highlights: 0, shadows: -0.1, temperature: -150, tint: -30 },
      'vintage': { exposure: -0.1, contrast: -0.1, highlights: -0.3, shadows: 0.3, saturation: -0.2, temperature: 150 },
      'high-contrast': { exposure: 0, contrast: 0.6, highlights: -0.4, shadows: -0.2, vibrance: 0.3 },
      'natural': { exposure: 0, contrast: 0.1, highlights: 0, shadows: 0, vibrance: 0.1, saturation: 0 }
    };

    setSettings(prev => ({
      ...prev,
      style: presetId,
      ...presets[presetId]
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const handleApply = () => {
    onApply(settings);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Professional Color Grading Suite
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="presets">Style Presets</TabsTrigger>
            <TabsTrigger value="exposure">Exposure & Tone</TabsTrigger>
            <TabsTrigger value="color">Color & Temperature</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PRESET_STYLES.map((preset) => {
                const Icon = preset.icon;
                return (
                  <Card 
                    key={preset.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      settings.style === preset.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => applyPreset(preset.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <h4 className="font-medium text-sm">{preset.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                      {settings.style === preset.id && (
                        <Badge variant="default" className="mt-2">Selected</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="exposure" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Exposure</Label>
                  <Slider
                    value={[settings.exposure]}
                    onValueChange={([value]) => updateSetting('exposure', value)}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {settings.exposure.toFixed(2)}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Contrast</Label>
                  <Slider
                    value={[settings.contrast]}
                    onValueChange={([value]) => updateSetting('contrast', value)}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {settings.contrast.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Highlights</Label>
                  <Slider
                    value={[settings.highlights]}
                    onValueChange={([value]) => updateSetting('highlights', value)}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {settings.highlights.toFixed(2)}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Shadows</Label>
                  <Slider
                    value={[settings.shadows]}
                    onValueChange={([value]) => updateSetting('shadows', value)}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {settings.shadows.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="color" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Vibrance</Label>
                  <Slider
                    value={[settings.vibrance]}
                    onValueChange={([value]) => updateSetting('vibrance', value)}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {settings.vibrance.toFixed(2)}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Saturation</Label>
                  <Slider
                    value={[settings.saturation]}
                    onValueChange={([value]) => updateSetting('saturation', value)}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {settings.saturation.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Temperature</Label>
                  <Slider
                    value={[settings.temperature]}
                    onValueChange={([value]) => updateSetting('temperature', value)}
                    min={-500}
                    max={500}
                    step={1}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {settings.temperature}K
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Tint</Label>
                  <Slider
                    value={[settings.tint]}
                    onValueChange={([value]) => updateSetting('tint', value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {settings.tint}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button variant="outline" onClick={resetSettings}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button 
              onClick={handleApply}
              disabled={isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? 'Processing...' : 'Apply Color Grade'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}