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
import { 
  FileText, Upload, Loader2, Film, Users, Wrench, 
  MapPin, Download, Languages, Trash2, Edit, Save, Plus 
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';

interface Scene {
  scene_id: number;
  slugline: string;
  description: string;
  characters: string[];
  props: string[];
  vfx: string[];
  estimated_pages: number;
  notes: string;
}

interface Breakdown {
  id: string;
  breakdown: any; // JSONB from database
  created_at: string;
  original_filename: string;
  raw_text: string;
}

export default function ScriptBreakdown() {
  const { user } = useAuth();
  const [scriptText, setScriptText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [selectedBreakdown, setSelectedBreakdown] = useState<Breakdown | null>(null);
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editedScenes, setEditedScenes] = useState<Scene[]>([]);
  const [translationLangs, setTranslationLangs] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  
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
    if (selectedBreakdown) {
      const scenes = Array.isArray(selectedBreakdown.breakdown) 
        ? selectedBreakdown.breakdown 
        : [];
      setEditedScenes(scenes);
      loadTranslations(selectedBreakdown.id);
    }
  }, [selectedBreakdown]);

  const loadBreakdowns = async () => {
    try {
      const { data, error } = await supabase
        .from('breakdowns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast breakdown field from JSONB to our Scene array
      const typedBreakdowns = (data || []).map(b => ({
        ...b,
        breakdown: Array.isArray(b.breakdown) ? b.breakdown : []
      })) as Breakdown[];
      
      setBreakdowns(typedBreakdowns);
      
      if (typedBreakdowns.length > 0 && !selectedBreakdown) {
        setSelectedBreakdown(typedBreakdowns[0]);
      }
    } catch (error: any) {
      console.error('Failed to load breakdowns:', error);
      toast.error('Failed to load breakdowns');
    }
  };

  const loadTranslations = async (breakdownId: string) => {
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('breakdown_id', breakdownId);

      if (error) throw error;
      
      const translationsMap: Record<string, string> = {};
      data?.forEach(t => {
        translationsMap[t.language] = t.translated_text;
      });
      setTranslations(translationsMap);
    } catch (error: any) {
      console.error('Failed to load translations:', error);
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

    if (scriptText.length < 50) {
      toast.error('Script is too short. Minimum 50 characters required.');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('script-breakdown-translate', {
        body: {
          rawText: scriptText,
          projectId: null,
          targetLangs: translationLangs,
          filename: 'uploaded_script.txt'
        }
      });

      if (error) throw error;

      toast.success('Script breakdown generated successfully!');
      await loadBreakdowns();
      
      // Select the newly created breakdown
      if (data.breakdownId) {
        const newBreakdown = breakdowns.find(b => b.id === data.breakdownId);
        if (newBreakdown) {
          setSelectedBreakdown(newBreakdown);
        }
      }
      
    } catch (error: any) {
      console.error('Breakdown generation error:', error);
      toast.error(`Failed to generate breakdown: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveBreakdown = async () => {
    if (!selectedBreakdown) return;

    try {
      const { error } = await supabase
        .from('breakdowns')
        .update({ breakdown: editedScenes as any }) // Cast to any for JSONB
        .eq('id', selectedBreakdown.id);

      if (error) throw error;

      toast.success('Breakdown saved successfully');
      setEditingScene(null);
      await loadBreakdowns();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save changes');
    }
  };

  const updateScene = (sceneId: number, field: keyof Scene, value: any) => {
    setEditedScenes(prev =>
      prev.map(scene =>
        scene.scene_id === sceneId ? { ...scene, [field]: value } : scene
      )
    );
  };

  const exportToCSV = () => {
    if (!selectedBreakdown) return;

    let csv = 'Scene,Slugline,Description,Characters,Props,VFX,Pages,Notes\n';
    editedScenes.forEach(scene => {
      csv += `${scene.scene_id},"${scene.slugline}","${scene.description}","${scene.characters.join('; ')}","${scene.props.join('; ')}","${scene.vfx.join('; ')}",${scene.estimated_pages},"${scene.notes}"\n`;
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

  const downloadTranslation = (lang: string) => {
    const text = translations[lang];
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation_${lang}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${lang} translation downloaded`);
  };

  const deleteBreakdown = async (id: string) => {
    try {
      const { error } = await supabase
        .from('breakdowns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Breakdown deleted');
      await loadBreakdowns();
      if (selectedBreakdown?.id === id) {
        setSelectedBreakdown(breakdowns[0] || null);
      }
    } catch (error: any) {
      toast.error('Failed to delete breakdown');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Film className="h-8 w-8" />
            Script Breakdown & Translation
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate professional script breakdowns and translate to African languages
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Generate</TabsTrigger>
          <TabsTrigger value="breakdown">View Breakdown</TabsTrigger>
          <TabsTrigger value="translations">Translations</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Script</CardTitle>
              <CardDescription>
                Upload a script file or paste text to generate breakdown
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
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
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

              <Button
                onClick={generateBreakdown}
                disabled={isProcessing || !scriptText.trim()}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Breakdown...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Breakdown
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
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
                  <h3 className="text-lg font-semibold">{selectedBreakdown.original_filename}</h3>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(selectedBreakdown.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={saveBreakdown}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteBreakdown(selectedBreakdown.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="h-5 w-5" />
                    Scene Breakdown ({editedScenes.length} scenes)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Scene</TableHead>
                          <TableHead>Slugline</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Characters</TableHead>
                          <TableHead>Props</TableHead>
                          <TableHead>VFX</TableHead>
                          <TableHead className="w-20">Pages</TableHead>
                          <TableHead className="w-16">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editedScenes.map((scene) => (
                          <TableRow key={scene.scene_id}>
                            <TableCell>{scene.scene_id}</TableCell>
                            <TableCell>
                              {editingScene === scene.scene_id ? (
                                <Input
                                  value={scene.slugline}
                                  onChange={(e) =>
                                    updateScene(scene.scene_id, 'slugline', e.target.value)
                                  }
                                />
                              ) : (
                                <div className="font-medium">{scene.slugline}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingScene === scene.scene_id ? (
                                <Textarea
                                  value={scene.description}
                                  onChange={(e) =>
                                    updateScene(scene.scene_id, 'description', e.target.value)
                                  }
                                />
                              ) : (
                                <div className="text-sm">{scene.description}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {scene.characters.map((char, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {char}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {scene.props.map((prop, idx) => (
                                  <Badge key={idx} variant="outline">
                                    {prop}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {scene.vfx.map((vfx, idx) => (
                                  <Badge key={idx} variant="default">
                                    {vfx}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>{scene.estimated_pages.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setEditingScene(
                                    editingScene === scene.scene_id ? null : scene.scene_id
                                  )
                                }
                              >
                                {editingScene === scene.scene_id ? (
                                  <Save className="h-4 w-4" />
                                ) : (
                                  <Edit className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Film className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold">{editedScenes.length}</div>
                            <div className="text-xs text-muted-foreground">Total Scenes</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold">
                              {[...new Set(editedScenes.flatMap(s => s.characters))].length}
                            </div>
                            <div className="text-xs text-muted-foreground">Characters</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold">
                              {[...new Set(editedScenes.flatMap(s => s.props))].length}
                            </div>
                            <div className="text-xs text-muted-foreground">Props</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold">
                              {editedScenes.reduce((sum, s) => sum + s.estimated_pages, 0).toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground">Est. Pages</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="translations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Available Translations
              </CardTitle>
              <CardDescription>
                Translations generated for the selected breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(translations).length === 0 ? (
                <div className="text-center py-12">
                  <Languages className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No translations available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Select translation languages when generating a breakdown
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(translations).map(([lang, text]) => (
                    <Card key={lang}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>
                            {africanLanguages.find(l => l.code === lang)?.name || lang}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadTranslation(lang)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={text}
                          readOnly
                          className="min-h-[150px]"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
