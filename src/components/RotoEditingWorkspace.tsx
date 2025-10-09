import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Move, Eraser, PenTool, Square, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RotoEditingWorkspaceProps {
  videoUrl?: string;
  onApplyEdits?: (edits: any) => void;
}

export function RotoEditingWorkspace({ videoUrl, onApplyEdits }: RotoEditingWorkspaceProps) {
  const { t } = useTranslation();
  const [selectedTool, setSelectedTool] = useState<'select' | 'pen' | 'eraser' | 'square' | 'circle'>('select');
  const [brushSize, setBrushSize] = useState(10);
  const [feather, setFeather] = useState(5);
  const [opacity, setOpacity] = useState(100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          {t('roto_editing_controls', 'Roto Editing Controls')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tools" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tools">{t('tools', 'Tools')}</TabsTrigger>
            <TabsTrigger value="brush">{t('brush', 'Brush')}</TabsTrigger>
            <TabsTrigger value="mask">{t('mask', 'Mask')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="space-y-4 pt-4">
            <div className="grid grid-cols-5 gap-2">
              <Button
                variant={selectedTool === 'select' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('select')}
                title={t('move_tool', 'Move Tool')}
              >
                <Move className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'pen' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('pen')}
                title={t('pen_tool', 'Pen Tool')}
              >
                <PenTool className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'eraser' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('eraser')}
                title={t('eraser', 'Eraser')}
              >
                <Eraser className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'square' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('square')}
                title={t('rectangle_mask', 'Rectangle Mask')}
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'circle' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('circle')}
                title={t('ellipse_mask', 'Ellipse Mask')}
              >
                <Circle className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="brush" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('brush_size', 'Brush Size')}: {brushSize}px</Label>
              <Slider
                value={[brushSize]}
                onValueChange={(v) => setBrushSize(v[0])}
                min={1}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('feather', 'Feather')}: {feather}px</Label>
              <Slider
                value={[feather]}
                onValueChange={(v) => setFeather(v[0])}
                min={0}
                max={50}
                step={1}
              />
            </div>
          </TabsContent>

          <TabsContent value="mask" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('mask_opacity', 'Mask Opacity')}: {opacity}%</Label>
              <Slider
                value={[opacity]}
                onValueChange={(v) => setOpacity(v[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm">{t('invert_mask', 'Invert Mask')}</Button>
              <Button variant="outline" size="sm">{t('clear_mask', 'Clear Mask')}</Button>
              <Button variant="outline" size="sm">{t('add_keyframe', 'Add Keyframe')}</Button>
              <Button variant="outline" size="sm">{t('track_forward', 'Track Forward')}</Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-2">
          <Button className="w-full" onClick={() => onApplyEdits?.({ brushSize, feather, opacity })}>
            {t('apply_edits', 'Apply Edits')}
          </Button>
          <Button variant="outline" className="w-full">
            {t('reset_all', 'Reset All')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
