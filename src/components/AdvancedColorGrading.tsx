import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Sun, Circle } from 'lucide-react';

interface ColorGradingSettings {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  // Color wheels
  lift_r: number;
  lift_g: number;
  lift_b: number;
  gamma_r: number;
  gamma_g: number;
  gamma_b: number;
  gain_r: number;
  gain_g: number;
  gain_b: number;
}

interface AdvancedColorGradingProps {
  onApply: (settings: ColorGradingSettings) => void;
  isProcessing?: boolean;
}

export function AdvancedColorGrading({ onApply, isProcessing }: AdvancedColorGradingProps) {
  const [settings, setSettings] = useState<ColorGradingSettings>({
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    temperature: 0,
    tint: 0,
    saturation: 0,
    vibrance: 0,
    lift_r: 0,
    lift_g: 0,
    lift_b: 0,
    gamma_r: 0,
    gamma_g: 0,
    gamma_b: 0,
    gain_r: 0,
    gain_g: 0,
    gain_b: 0,
  });

  const updateSetting = (key: keyof ColorGradingSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetAll = () => {
    setSettings({
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      temperature: 0,
      tint: 0,
      saturation: 0,
      vibrance: 0,
      lift_r: 0,
      lift_g: 0,
      lift_b: 0,
      gamma_r: 0,
      gamma_g: 0,
      gamma_b: 0,
      gain_r: 0,
      gain_g: 0,
      gain_b: 0,
    });
  };

  const applyPreset = (preset: string) => {
    const presets: Record<string, Partial<ColorGradingSettings>> = {
      cinematic: {
        exposure: 0.2,
        contrast: 15,
        highlights: -10,
        shadows: 20,
        temperature: 5,
        saturation: -5,
      },
      warm: {
        temperature: 25,
        tint: 5,
        saturation: 10,
        vibrance: 15,
      },
      cool: {
        temperature: -25,
        tint: -5,
        saturation: 10,
      },
      vintage: {
        exposure: -0.3,
        contrast: 20,
        saturation: -15,
        temperature: 15,
      },
    };

    if (presets[preset]) {
      setSettings(prev => ({ ...prev, ...presets[preset] }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Advanced Color Grading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="tone">Tone</TabsTrigger>
            <TabsTrigger value="color">Color</TabsTrigger>
            <TabsTrigger value="wheels">Wheels</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Exposure: {settings.exposure.toFixed(2)}</Label>
              <Slider
                value={[settings.exposure]}
                onValueChange={(v) => updateSetting('exposure', v[0])}
                min={-2}
                max={2}
                step={0.01}
              />
            </div>
            <div className="space-y-2">
              <Label>Contrast: {settings.contrast}</Label>
              <Slider
                value={[settings.contrast]}
                onValueChange={(v) => updateSetting('contrast', v[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Saturation: {settings.saturation}</Label>
              <Slider
                value={[settings.saturation]}
                onValueChange={(v) => updateSetting('saturation', v[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Vibrance: {settings.vibrance}</Label>
              <Slider
                value={[settings.vibrance]}
                onValueChange={(v) => updateSetting('vibrance', v[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>
          </TabsContent>

          <TabsContent value="tone" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Highlights: {settings.highlights}</Label>
              <Slider
                value={[settings.highlights]}
                onValueChange={(v) => updateSetting('highlights', v[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Shadows: {settings.shadows}</Label>
              <Slider
                value={[settings.shadows]}
                onValueChange={(v) => updateSetting('shadows', v[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Whites: {settings.whites}</Label>
              <Slider
                value={[settings.whites]}
                onValueChange={(v) => updateSetting('whites', v[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Blacks: {settings.blacks}</Label>
              <Slider
                value={[settings.blacks]}
                onValueChange={(v) => updateSetting('blacks', v[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>
          </TabsContent>

          <TabsContent value="color" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Temperature: {settings.temperature}</Label>
              <Slider
                value={[settings.temperature]}
                onValueChange={(v) => updateSetting('temperature', v[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Tint: {settings.tint}</Label>
              <Slider
                value={[settings.tint]}
                onValueChange={(v) => updateSetting('tint', v[0])}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="pt-4">
              <Label className="mb-2 block">Quick Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => applyPreset('cinematic')}>
                  Cinematic
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('warm')}>
                  Warm
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('cool')}>
                  Cool
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('vintage')}>
                  Vintage
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wheels" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Lift (Shadows)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-red-600">R</Label>
                    <Slider
                      value={[settings.lift_r]}
                      onValueChange={(v) => updateSetting('lift_r', v[0])}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-green-600">G</Label>
                    <Slider
                      value={[settings.lift_g]}
                      onValueChange={(v) => updateSetting('lift_g', v[0])}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-600">B</Label>
                    <Slider
                      value={[settings.lift_b]}
                      onValueChange={(v) => updateSetting('lift_b', v[0])}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Gamma (Midtones)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-red-600">R</Label>
                    <Slider
                      value={[settings.gamma_r]}
                      onValueChange={(v) => updateSetting('gamma_r', v[0])}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-green-600">G</Label>
                    <Slider
                      value={[settings.gamma_g]}
                      onValueChange={(v) => updateSetting('gamma_g', v[0])}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-600">B</Label>
                    <Slider
                      value={[settings.gamma_b]}
                      onValueChange={(v) => updateSetting('gamma_b', v[0])}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Gain (Highlights)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-red-600">R</Label>
                    <Slider
                      value={[settings.gain_r]}
                      onValueChange={(v) => updateSetting('gain_r', v[0])}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-green-600">G</Label>
                    <Slider
                      value={[settings.gain_g]}
                      onValueChange={(v) => updateSetting('gain_g', v[0])}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-600">B</Label>
                    <Slider
                      value={[settings.gain_b]}
                      onValueChange={(v) => updateSetting('gain_b', v[0])}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex gap-2">
          <Button 
            onClick={() => onApply(settings)} 
            disabled={isProcessing}
            className="flex-1"
          >
            Apply Color Grade
          </Button>
          <Button 
            onClick={resetAll} 
            variant="outline"
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
