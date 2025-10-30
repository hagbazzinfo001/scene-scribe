import { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Box, Download, Save, Trash2, Loader2, Image as ImageIcon, Type, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useLoader } from '@react-three/fiber';

// Test user whitelist
const ALLOWED_USERS = ['admin', 'tester1', 'tester2'];

// Mock 3D generation function
const generate3D = async (inputType: 'text' | 'image', promptOrImage: string): Promise<{
  meshURL: string;
  quality: string;
  time: string;
  source: string;
  name: string;
  date: string;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    meshURL: "/placeholder.svg", // Mock GLB URL - will use placeholder until real model
    quality: "high",
    time: "45s",
    source: inputType,
    name: inputType === 'text' ? promptOrImage.slice(0, 30) : 'Image-based model',
    date: new Date().toISOString()
  };
};

function Model({ url }: { url: string }) {
  try {
    const gltf = useLoader(GLTFLoader, url);
    return <primitive object={gltf.scene} />;
  } catch {
    return null;
  }
}

interface GeneratedModel {
  id: string;
  meshURL: string;
  quality: string;
  time: string;
  source: string;
  name: string;
  date: string;
}

export default function MeshGenerator() {
  const { user } = useAuth();
  const [textPrompt, setTextPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentModel, setCurrentModel] = useState<GeneratedModel | null>(null);
  const [savedModels, setSavedModels] = useState<GeneratedModel[]>([]);
  const [activeTab, setActiveTab] = useState('text-to-3d');

  // Load saved models from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nolly_generated_models');
    if (saved) {
      try {
        setSavedModels(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved models:', e);
      }
    }
  }, []);

  // Check user access
  const hasAccess = user?.email && (
    ALLOWED_USERS.includes(user.email.split('@')[0]) || 
    user.email.includes('admin')
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (type: 'text' | 'image') => {
    if (!hasAccess) {
      toast.error('Testing Access Only - Contact admin for access');
      return;
    }

    if (type === 'text' && !textPrompt.trim()) {
      toast.error('Please enter a text prompt');
      return;
    }

    if (type === 'image' && !imageFile) {
      toast.error('Please upload an image');
      return;
    }

    setIsGenerating(true);
    toast.loading('Generating 3D model...', { id: 'generating' });

    try {
      const input = type === 'text' ? textPrompt : imageFile!.name;
      const result = await generate3D(type, input);
      
      const newModel: GeneratedModel = {
        id: `model_${Date.now()}`,
        ...result
      };

      setCurrentModel(newModel);
      toast.success('3D model generated successfully!', { id: 'generating' });
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate 3D model', { id: 'generating' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!currentModel) return;
    
    const updated = [currentModel, ...savedModels];
    setSavedModels(updated);
    localStorage.setItem('nolly_generated_models', JSON.stringify(updated));
    toast.success('Model saved to library!');
  };

  const handleDownload = () => {
    if (!currentModel) return;
    
    // Mock download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent('Mock GLB file'));
    element.setAttribute('download', `${currentModel.name.replace(/\s+/g, '_')}.glb`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast.success('Model downloaded! (Mock file)');
  };

  const handleClear = () => {
    setCurrentModel(null);
    setTextPrompt('');
    setImageFile(null);
    setImagePreview('');
  };

  const handleDeleteModel = (id: string) => {
    const updated = savedModels.filter(m => m.id !== id);
    setSavedModels(updated);
    localStorage.setItem('nolly_generated_models', JSON.stringify(updated));
    toast.success('Model deleted');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Card className="p-8 bg-[#1a1a1a] border-[#00ff99]/20">
          <p className="text-xl text-center">Please sign in to access the 3D Generator</p>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Card className="p-8 bg-[#1a1a1a] border-[#00ff99]/20">
          <div className="text-center space-y-4">
            <Box className="h-16 w-16 mx-auto text-[#00ff99]" />
            <h2 className="text-2xl font-bold text-white">Testing Access Only</h2>
            <p className="text-gray-400">This feature is currently in closed beta for 3 test users.</p>
            <p className="text-sm text-gray-500">Contact admin@nollyai.com for access.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <Box className="h-10 w-10 text-[#00ff99]" />
              AI 3D Generator <span className="text-[#00ff99]">(Reeva Mesh)</span>
            </h1>
            <p className="text-gray-400">Transform text and images into high-quality 3D assets</p>
          </div>
          <Badge className="bg-[#00ff99]/20 text-[#00ff99] border-[#00ff99]/50 px-6 py-2 text-lg">
            ALPHA
          </Badge>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#1a1a1a] border border-[#00ff99]/20 mb-6">
            <TabsTrigger 
              value="text-to-3d" 
              className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black"
            >
              <Type className="h-4 w-4 mr-2" />
              Text to 3D
            </TabsTrigger>
            <TabsTrigger 
              value="image-to-3d"
              className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Image to 3D
            </TabsTrigger>
            <TabsTrigger 
              value="generated-models"
              className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black"
            >
              <Database className="h-4 w-4 mr-2" />
              Generated Models ({savedModels.length})
            </TabsTrigger>
          </TabsList>

          {/* Text to 3D Tab */}
          <TabsContent value="text-to-3d">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <Card className="bg-[#1a1a1a] border-[#00ff99]/20">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Text Prompt</Label>
                    <Input
                      value={textPrompt}
                      onChange={(e) => setTextPrompt(e.target.value)}
                      placeholder="Describe your 3D model... (e.g., 'A futuristic spaceship')"
                      className="bg-[#0a0a0a] border-[#00ff99]/30 text-white h-12"
                    />
                  </div>
                  <Button
                    onClick={() => handleGenerate('text')}
                    disabled={isGenerating}
                    className="w-full h-12 bg-[#00ff99] text-black hover:bg-[#00ff99]/90 font-semibold"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate 3D Model'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview Panel */}
              <Card className="bg-[#1a1a1a] border-[#00ff99]/20">
                <CardContent className="p-6">
                  <div className="bg-[#0a0a0a] rounded-lg h-[400px] flex items-center justify-center border border-[#00ff99]/20">
                    {currentModel ? (
                      <Canvas camera={{ position: [0, 0, 3], fov: 60 }}>
                        <Suspense fallback={null}>
                          <ambientLight intensity={0.5} />
                          <directionalLight position={[10, 10, 5]} intensity={1} />
                          <Center>
                            <mesh>
                              <boxGeometry args={[1, 1, 1]} />
                              <meshStandardMaterial color="#00ff99" />
                            </mesh>
                          </Center>
                          <OrbitControls enableDamping />
                        </Suspense>
                      </Canvas>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Box className="h-20 w-20 mx-auto mb-4 opacity-20" />
                        <p>Your 3D model will appear here</p>
                      </div>
                    )}
                  </div>
                  
                  {currentModel && (
                    <div className="flex gap-3 mt-4">
                      <Button onClick={handleSave} variant="outline" className="flex-1 border-[#00ff99]/30 text-white">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleDownload} variant="outline" className="flex-1 border-[#00ff99]/30 text-white">
                        <Download className="h-4 w-4 mr-2" />
                        Download GLB
                      </Button>
                      <Button onClick={handleClear} variant="outline" className="flex-1 border-[#00ff99]/30 text-white">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Image to 3D Tab */}
          <TabsContent value="image-to-3d">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Panel */}
              <Card className="bg-[#1a1a1a] border-[#00ff99]/20">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Upload Image</Label>
                    <div className="border-2 border-dashed border-[#00ff99]/30 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                        ) : (
                          <>
                            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-[#00ff99]/50" />
                            <p className="text-gray-400">Click to upload PNG or JPG</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleGenerate('image')}
                    disabled={isGenerating}
                    className="w-full h-12 bg-[#00ff99] text-black hover:bg-[#00ff99]/90 font-semibold"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate 3D Model'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview Panel */}
              <Card className="bg-[#1a1a1a] border-[#00ff99]/20">
                <CardContent className="p-6">
                  <div className="bg-[#0a0a0a] rounded-lg h-[400px] flex items-center justify-center border border-[#00ff99]/20">
                    {currentModel ? (
                      <Canvas camera={{ position: [0, 0, 3], fov: 60 }}>
                        <Suspense fallback={null}>
                          <ambientLight intensity={0.5} />
                          <directionalLight position={[10, 10, 5]} intensity={1} />
                          <Center>
                            <mesh>
                              <sphereGeometry args={[1, 32, 32]} />
                              <meshStandardMaterial color="#00ff99" />
                            </mesh>
                          </Center>
                          <OrbitControls enableDamping />
                        </Suspense>
                      </Canvas>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Box className="h-20 w-20 mx-auto mb-4 opacity-20" />
                        <p>Your 3D model will appear here</p>
                      </div>
                    )}
                  </div>
                  
                  {currentModel && (
                    <div className="flex gap-3 mt-4">
                      <Button onClick={handleSave} variant="outline" className="flex-1 border-[#00ff99]/30 text-white">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleDownload} variant="outline" className="flex-1 border-[#00ff99]/30 text-white">
                        <Download className="h-4 w-4 mr-2" />
                        Download GLB
                      </Button>
                      <Button onClick={handleClear} variant="outline" className="flex-1 border-[#00ff99]/30 text-white">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Generated Models Tab */}
          <TabsContent value="generated-models">
            <Card className="bg-[#1a1a1a] border-[#00ff99]/20">
              <CardContent className="p-6">
                {savedModels.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Database className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>No saved models yet. Generate some 3D models to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedModels.map((model) => (
                      <Card key={model.id} className="bg-[#0a0a0a] border-[#00ff99]/20">
                        <CardContent className="p-4 space-y-3">
                          <div className="bg-[#1a1a1a] h-32 rounded flex items-center justify-center border border-[#00ff99]/20">
                            <Box className="h-12 w-12 text-[#00ff99]/50" />
                          </div>
                          <div>
                            <p className="font-semibold text-white truncate">{model.name}</p>
                            <p className="text-xs text-gray-400">{new Date(model.date).toLocaleDateString()}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs border-[#00ff99]/30 text-[#00ff99]">
                                {model.source}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-[#00ff99]/30">
                                {model.quality}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 border-[#00ff99]/30 text-white"
                              onClick={() => setCurrentModel(model)}
                            >
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-[#00ff99]/30 text-white"
                              onClick={() => handleDeleteModel(model.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reeva Watermark */}
        <div className="fixed bottom-4 right-4 text-xs text-gray-600 flex items-center gap-2">
          <Box className="h-3 w-3 text-[#00ff99]" />
          <span>Powered by <span className="text-[#00ff99] font-semibold">Reeva</span></span>
        </div>
      </div>
    </div>
  );
}
