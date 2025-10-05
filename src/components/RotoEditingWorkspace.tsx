import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Move, Eraser, PenTool, Square, Circle } from 'lucide-react';

interface RotoEditingWorkspaceProps {
  videoUrl?: string;
  onApplyEdits?: (edits: any) => void;
}

export function RotoEditingWorkspace({ videoUrl, onApplyEdits }: RotoEditingWorkspaceProps) {
  const [selectedTool, setSelectedTool] = useState<'select' | 'pen' | 'eraser' | 'square' | 'circle'>('select');
  const [brushSize, setBrushSize] = useState(10);
  const [feather, setFeather] = useState(5);
  const [opacity, setOpacity] = useState(100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Roto Editing Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tools" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="brush">Brush</TabsTrigger>
            <TabsTrigger value="mask">Mask</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="space-y-4 pt-4">
            <div className="grid grid-cols-5 gap-2">
              <Button
                variant={selectedTool === 'select' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('select')}
                title="Move Tool"
              >
                <Move className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'pen' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('pen')}
                title="Pen Tool"
              >
                <PenTool className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'eraser' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('eraser')}
                title="Eraser"
              >
                <Eraser className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'square' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('square')}
                title="Rectangle Mask"
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedTool === 'circle' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectedTool('circle')}
                title="Ellipse Mask"
              >
                <Circle className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="brush" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Brush Size: {brushSize}px</Label>
              <Slider
                value={[brushSize]}
                onValueChange={(v) => setBrushSize(v[0])}
                min={1}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Feather: {feather}px</Label>
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
              <Label>Mask Opacity: {opacity}%</Label>
              <Slider
                value={[opacity]}
                onValueChange={(v) => setOpacity(v[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm">Invert Mask</Button>
              <Button variant="outline" size="sm">Clear Mask</Button>
              <Button variant="outline" size="sm">Add Keyframe</Button>
              <Button variant="outline" size="sm">Track Forward</Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-2">
          <Button className="w-full" onClick={() => onApplyEdits?.({ brushSize, feather, opacity })}>
            Apply Edits
          </Button>
          <Button variant="outline" className="w-full">
            Reset All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
