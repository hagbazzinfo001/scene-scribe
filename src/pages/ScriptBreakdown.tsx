import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Upload, Loader2, Film, Users, Wrench, 
  MapPin, Download, Languages, Trash2, CheckCircle2,
  Shirt, Sparkles, Clapperboard, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { useJobStatus } from '@/hooks/useJobStatus';

interface ComprehensiveBreakdown {
  scenes: any[];
  characters: { name: string; type: string; scene_count: number; scenes: number[] }[];
  props: { name: string; scenes: number[]; quantity?: number }[];
  locations: { name: string; int_ext: string; time: string[]; scenes: number[] }[];
  wardrobe: { character: string; items: string[]; changes: number }[];
  vfx_requirements: { type: string; complexity: string; scenes: number[] }[];
  production_requirements: {
    stunts: string[];
    animals: string[];
    children: number;
    vehicles: string[];
    crowd_scenes: number[];
    special_equipment: string[];
  };
  statistics: {
    total_scenes: number;
    total_pages: number;
    total_characters: number;
    total_locations: number;
    shooting_days_estimate: number;
  };
}

export default function ScriptBreakdown() {
  const { user } = useAuth();
  const [scriptText, setScriptText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [selectedBreakdown, setSelectedBreakdown] = useState<ComprehensiveBreakdown | null>(null);
  const [translationLangs, setTranslationLangs] = useState<string[]>([]);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  
  const { job, isPolling } = useJobStatus(currentJobId);
  
  const africanLanguages = [
    { code: 'yoruba', name: 'Yoruba' },
    { code: 'igbo', name: 'Igbo' },
    { code: 'hausa', name: 'Hausa' },
    { code: 'swahili', name: 'Swahili' },
  ];

  useEffect(() => {
    if (user) {
      loadBreakdowns();
    }
  }, [user]);

  useEffect(() => {
    if (job) {
      if (job.status === 'processing') {
        setProcessingStep('Analyzing script...');
        setProgress(50);
      } else if (job.status === 'done') {
        setIsProcessing(false);
        setCurrentJobId(null);
        setProgress(100);
        toast.success('Script breakdown completed!');
        loadBreakdowns();
      } else if (job.status === 'failed') {
        setIsProcessing(false);
        setCurrentJobId(null);
        setProgress(0);
        toast.error(`Breakdown failed: ${job.error_message || 'Unknown error'}`);
      }
    }
  }, [job]);

  const loadBreakdowns = async () => {
    try {
      const { data, error } = await supabase
        .from('breakdowns')
        .select('*')
        .eq('type', 'comprehensive')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setBreakdowns(data || []);
      
      if (data && data.length > 0 && !selectedBreakdown) {
        setSelectedBreakdown(data[0].breakdown as unknown as ComprehensiveBreakdown);
      }
    } catch (error: any) {
      console.error('Failed to load breakdowns:', error);
      toast.error('Failed to load breakdowns');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setScriptText(text);
      toast.success('Script loaded successfully');
    };
    reader.readAsText(file);
  };

  const generateBreakdown = async () => {
    if (!scriptText.trim()) {
      toast.error('Please enter or upload script text');
      return;
    }

    if (scriptText.length < 100) {
      toast.error('Script is too short. Minimum 100 characters required.');
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setProcessingStep('Creating job...');

    try {
      // Create job first
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user?.id,
          type: 'script-breakdown',
          status: 'pending',
          input_data: { scriptLength: scriptText.length }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setCurrentJobId(newJob.id);
      setProgress(20);
      setProcessingStep('Uploading...');

      // Call the pro breakdown function
      const { error } = await supabase.functions.invoke('script-breakdown-pro', {
        body: {
          scriptText,
          jobId: newJob.id,
          projectId: null,
          translateTo: translationLangs
        }
      });

      if (error) throw error;

      setProgress(30);
      setProcessingStep('Processing in background...');
      toast.info('Script breakdown started! Processing in background...');
      
    } catch (error: any) {
      console.error('Breakdown generation error:', error);
      toast.error(`Failed to start breakdown: ${error.message}`);
      setIsProcessing(false);
      setCurrentJobId(null);
      setProgress(0);
    }
  };

  const exportToCSV = () => {
    if (!selectedBreakdown) return;

    let csv = 'Scene,Slugline,INT/EXT,Time,Location,Characters,Props,Wardrobe,VFX,Pages\n';
    selectedBreakdown.scenes.forEach(scene => {
      csv += `${scene.scene_number},"${scene.slugline}",${scene.int_ext},${scene.time},"${scene.location}","${scene.characters.join('; ')}","${scene.props.join('; ')}","${scene.wardrobe.join('; ')}","${scene.vfx_sfx.join('; ')}",${scene.estimated_pages}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakdown_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Breakdown exported to CSV');
  };

  const exportToPDF = () => {
    if (!selectedBreakdown) return;

    let text = '=== SCRIPT BREAKDOWN ===\n\n';
    text += `Total Scenes: ${selectedBreakdown.statistics.total_scenes}\n`;
    text += `Total Pages: ${selectedBreakdown.statistics.total_pages.toFixed(2)}\n`;
    text += `Characters: ${selectedBreakdown.statistics.total_characters}\n`;
    text += `Locations: ${selectedBreakdown.statistics.total_locations}\n`;
    text += `Estimated Shooting Days: ${selectedBreakdown.statistics.shooting_days_estimate}\n\n`;

    text += '=== CHARACTERS ===\n';
    selectedBreakdown.characters.forEach(char => {
      text += `${char.name} (${char.type}) - ${char.scene_count} scenes\n`;
    });

    text += '\n=== LOCATIONS ===\n';
    selectedBreakdown.locations.forEach(loc => {
      text += `${loc.name} (${loc.int_ext}) - ${loc.scenes.length} scenes\n`;
    });

    text += '\n=== VFX REQUIREMENTS ===\n';
    selectedBreakdown.vfx_requirements.forEach(vfx => {
      text += `${vfx.type} (${vfx.complexity}) - Scenes: ${vfx.scenes.join(', ')}\n`;
    });

    text += '\n=== PRODUCTION REQUIREMENTS ===\n';
    text += `Stunts: ${selectedBreakdown.production_requirements.stunts.join(', ') || 'None'}\n`;
    text += `Animals: ${selectedBreakdown.production_requirements.animals.join(', ') || 'None'}\n`;
    text += `Children: ${selectedBreakdown.production_requirements.children}\n`;
    text += `Vehicles: ${selectedBreakdown.production_requirements.vehicles.join(', ') || 'None'}\n`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakdown_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Breakdown exported');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Film className="h-8 w-8" />
            Professional Script Breakdown
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered comprehensive breakdown with production requirements
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload & Generate</TabsTrigger>
          <TabsTrigger value="results">Results & Export</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Script</CardTitle>
              <CardDescription>
                Upload a script file or paste text for comprehensive breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="script-file">Upload Script File (TXT, PDF, DOCX)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="script-file"
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="script-text">Or Paste Script Text</Label>
                <Textarea
                  id="script-text"
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste your script here..."
                  className="min-h-[300px] mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {scriptText.length} characters • ~{Math.ceil(scriptText.length / 1800)} pages
                </p>
              </div>

              <div>
                <Label>Translation Languages (Optional)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {africanLanguages.map(lang => (
                    <div key={lang.code} className="flex items-center space-x-2">
                      <Checkbox
                        id={lang.code}
                        checked={translationLangs.includes(lang.code)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTranslationLangs([...translationLangs, lang.code]);
                          } else {
                            setTranslationLangs(translationLangs.filter(l => l !== lang.code));
                          }
                        }}
                      />
                      <label htmlFor={lang.code} className="text-sm cursor-pointer">
                        {lang.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{processingStep}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <Button
                onClick={generateBreakdown}
                disabled={isProcessing || !scriptText.trim()}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Professional Breakdown
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Cost: ~₦150 per 10-page script • Uses GPT-4.1-mini & GPT-4o-mini
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {!selectedBreakdown ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No breakdowns available yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload a script to generate your first breakdown
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Comprehensive Breakdown</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBreakdown.statistics.total_scenes} scenes • {selectedBreakdown.statistics.total_pages.toFixed(1)} pages
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={exportToPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Text
                  </Button>
                </div>
              </div>

              {/* Statistics Overview */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedBreakdown.statistics.total_scenes}</div>
                    <div className="text-sm text-muted-foreground">Scenes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedBreakdown.statistics.total_characters}</div>
                    <div className="text-sm text-muted-foreground">Characters</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedBreakdown.statistics.total_locations}</div>
                    <div className="text-sm text-muted-foreground">Locations</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedBreakdown.statistics.total_pages.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Pages</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedBreakdown.statistics.shooting_days_estimate}</div>
                    <div className="text-sm text-muted-foreground">Est. Days</div>
                  </CardContent>
                </Card>
              </div>

              {/* Characters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Characters ({selectedBreakdown.characters.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedBreakdown.characters.map((char, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{char.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {char.type} • {char.scene_count} scenes
                            </div>
                          </div>
                        </div>
                        <Badge variant={char.type === 'main' ? 'default' : 'secondary'}>
                          {char.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Locations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Locations ({selectedBreakdown.locations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedBreakdown.locations.map((loc, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="font-medium">{loc.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {loc.int_ext} • {loc.time.join(', ')} • {loc.scenes.length} scenes
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Props */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Props ({selectedBreakdown.props.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedBreakdown.props.map((prop, idx) => (
                      <Badge key={idx} variant="outline">
                        {prop.name} {prop.quantity && `(${prop.quantity})`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Wardrobe */}
              {selectedBreakdown.wardrobe.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shirt className="h-5 w-5" />
                      Wardrobe
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedBreakdown.wardrobe.map((w, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="font-medium">{w.character}</div>
                          <div className="text-sm text-muted-foreground">
                            {w.items.join(', ')} • {w.changes} changes
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* VFX */}
              {selectedBreakdown.vfx_requirements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      VFX Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedBreakdown.vfx_requirements.map((vfx, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{vfx.type}</div>
                            <div className="text-sm text-muted-foreground">
                              Scenes: {vfx.scenes.join(', ')}
                            </div>
                          </div>
                          <Badge variant={
                            vfx.complexity === 'high' ? 'destructive' : 
                            vfx.complexity === 'medium' ? 'default' : 'secondary'
                          }>
                            {vfx.complexity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Production Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clapperboard className="h-5 w-5" />
                    Production Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedBreakdown.production_requirements.stunts.length > 0 && (
                      <div>
                        <div className="font-medium mb-2">Stunts</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedBreakdown.production_requirements.stunts.join(', ')}
                        </div>
                      </div>
                    )}
                    {selectedBreakdown.production_requirements.vehicles.length > 0 && (
                      <div>
                        <div className="font-medium mb-2">Vehicles</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedBreakdown.production_requirements.vehicles.join(', ')}
                        </div>
                      </div>
                    )}
                    {selectedBreakdown.production_requirements.animals.length > 0 && (
                      <div>
                        <div className="font-medium mb-2">Animals</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedBreakdown.production_requirements.animals.join(', ')}
                        </div>
                      </div>
                    )}
                    {selectedBreakdown.production_requirements.children > 0 && (
                      <div>
                        <div className="font-medium mb-2">Children</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedBreakdown.production_requirements.children} required
                        </div>
                      </div>
                    )}
                    {selectedBreakdown.production_requirements.special_equipment.length > 0 && (
                      <div>
                        <div className="font-medium mb-2">Special Equipment</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedBreakdown.production_requirements.special_equipment.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
