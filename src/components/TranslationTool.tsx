import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Languages, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TranslationToolProps {
  projectId?: string;
}

export function TranslationTool({ projectId }: TranslationToolProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [scriptContent, setScriptContent] = useState('');

  // Load script content if projectId is available
  useEffect(() => {
    if (projectId) {
      loadProjectScript();
    }
  }, [projectId]);

  const loadProjectScript = async () => {
    try {
      const { data: scripts } = await supabase
        .from('scripts')
        .select('content')
        .eq('project_id', projectId)
        .limit(1);
      
      if (scripts && scripts[0]?.content) {
        setScriptContent(scripts[0].content);
        setText(scripts[0].content);
      }
    } catch (error) {
      console.error('Failed to load script:', error);
    }
  };

  const africanLanguages = [
    { code: 'yoruba', name: 'Yoruba' },
    { code: 'igbo', name: 'Igbo' },
    { code: 'hausa', name: 'Hausa' },
    { code: 'swahili', name: 'Swahili' },
    { code: 'amharic', name: 'Amharic' },
    { code: 'french', name: 'French' },
    { code: 'portuguese', name: 'Portuguese' },
    { code: 'arabic', name: 'Arabic' }
  ];

  const handleTranslate = async () => {
    if (!text.trim() || !targetLanguage) {
      toast.error('Please enter text and select a target language');
      return;
    }

    setIsTranslating(true);
    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase.functions.invoke('nllb-translate', {
        body: {
          text: text.trim(),
          targetLanguage,
          sourceLanguage: 'eng_Latn'
        },
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (error) throw error;
      
      setTranslatedText(data.translatedText);
      toast.success(`Translated to ${africanLanguages.find(l => l.code === targetLanguage)?.name || targetLanguage}!`);
      
    } catch (error: any) {
      console.error('Translation error:', error);
      toast.error(`Translation failed: ${error.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownload = () => {
    if (!translatedText) return;
    
    const blob = new Blob([translatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${targetLanguage}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Translation downloaded!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Script Translation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="source-text">Original Text (English)</Label>
            <Textarea
              id="source-text"
              placeholder={projectId ? "Script content loaded from project..." : "Enter script text to translate..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 min-h-[200px]"
            />
            {projectId && scriptContent && (
              <p className="text-xs text-muted-foreground mt-1">
                Script content auto-loaded from project
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="target-language">Target Language</Label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select African language" />
              </SelectTrigger>
              <SelectContent>
                {africanLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleTranslate} 
            disabled={isTranslating || !text.trim() || !targetLanguage}
            className="w-full"
          >
            {isTranslating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Translating...
              </>
            ) : (
              'Translate Script'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Translation Result</CardTitle>
        </CardHeader>
        <CardContent>
          {translatedText ? (
            <div className="space-y-4">
              <div>
                <Label>Translated Text ({africanLanguages.find(l => l.code === targetLanguage)?.name})</Label>
                <Textarea
                  value={translatedText}
                  readOnly
                  className="mt-1 min-h-[200px]"
                />
              </div>
              <Button onClick={handleDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Translation
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Languages className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Translated text will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}