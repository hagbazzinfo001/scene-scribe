// Free AI Service using open-source models and local processing
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for browser usage
env.allowLocalModels = false;
env.useBrowserCache = true;

interface AIServiceOptions {
  provider?: 'huggingface' | 'local' | 'ollama';
  model?: string;
  fallback?: boolean;
}

export class FreeAIService {
  private static instance: FreeAIService;
  private textPipeline: any = null;
  private embedPipeline: any = null;

  static getInstance(): FreeAIService {
    if (!FreeAIService.instance) {
      FreeAIService.instance = new FreeAIService();
    }
    return FreeAIService.instance;
  }

  async initializeTextPipeline() {
    if (!this.textPipeline) {
      try {
        this.textPipeline = await pipeline(
          'text2text-generation',
          'Xenova/flan-t5-base',
          { device: 'webgpu' }
        );
      } catch (error) {
        console.warn('WebGPU not available, falling back to CPU');
        this.textPipeline = await pipeline(
          'text2text-generation',
          'Xenova/flan-t5-base'
        );
      }
    }
    return this.textPipeline;
  }

  async processScript(scriptContent: string): Promise<any> {
    try {
      const pipeline = await this.initializeTextPipeline();
      
      const prompt = `Analyze this script and extract characters, scenes, props, and locations in JSON format:\n\n${scriptContent.slice(0, 2000)}`;
      
      const result = await pipeline(prompt, {
        max_length: 512,
        num_beams: 4,
        early_stopping: true
      });

      // Parse the generated text and structure it
      const analysis = {
        characters: this.extractCharacters(scriptContent),
        scenes: this.extractScenes(scriptContent),
        props: this.extractProps(scriptContent),
        locations: this.extractLocations(scriptContent),
        summary: result[0]?.generated_text || "Script analysis completed"
      };

      return {
        success: true,
        data: analysis,
        provider: 'huggingface-local'
      };
    } catch (error) {
      console.error('Script processing error:', error);
      // Fallback to basic regex parsing
      return this.fallbackScriptAnalysis(scriptContent);
    }
  }

  private extractCharacters(script: string): string[] {
    const characterRegex = /^([A-Z][A-Z\s]+)$/gm;
    const matches = script.match(characterRegex) || [];
    return [...new Set(matches.map(m => m.trim()))].slice(0, 20);
  }

  private extractScenes(script: string): string[] {
    const sceneRegex = /(INT\.|EXT\.)([^\n]+)/gi;
    const matches = script.match(sceneRegex) || [];
    return matches.map(m => m.trim()).slice(0, 20);
  }

  private extractProps(script: string): string[] {
    const propWords = ['gun', 'phone', 'car', 'knife', 'bag', 'money', 'documents', 'laptop', 'camera'];
    const props: string[] = [];
    propWords.forEach(prop => {
      if (script.toLowerCase().includes(prop)) {
        props.push(prop);
      }
    });
    return props;
  }

  private extractLocations(script: string): string[] {
    const locationRegex = /(INT\.|EXT\.)\s*([^-\n]+)/gi;
    const matches = script.match(locationRegex) || [];
    return matches.map(m => m.replace(/(INT\.|EXT\.)/gi, '').trim()).slice(0, 15);
  }

  private fallbackScriptAnalysis(script: string) {
    return {
      success: true,
      data: {
        characters: this.extractCharacters(script),
        scenes: this.extractScenes(script),
        props: this.extractProps(script),
        locations: this.extractLocations(script),
        summary: "Basic script analysis completed using pattern matching"
      },
      provider: 'regex-fallback'
    };
  }

  async chatAssistant(message: string, context?: string): Promise<any> {
    try {
      // For now, use a simple response system
      // In production, this would connect to Ollama or local LLM
      const responses = {
        script: "I can help analyze your script for characters, scenes, and production planning.",
        breakdown: "Script breakdown identifies all production elements needed for filming.",
        vfx: "I can assist with VFX planning and workflow optimization.",
        audio: "Audio cleanup and enhancement tools are available.",
        color: "Color grading tools can help achieve your desired cinematic look."
      };

      const lowerMessage = message.toLowerCase();
      let response = "I'm your AI assistant for Nollywood film production. How can I help you today?";

      for (const [key, value] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
          response = value;
          break;
        }
      }

      return {
        success: true,
        response,
        provider: 'local-assistant'
      };
    } catch (error) {
      return {
        success: false,
        response: "I'm currently offline. Please try again later.",
        provider: 'fallback'
      };
    }
  }

  async generateMesh(description: string, type: string, complexity: string): Promise<any> {
    // This would integrate with open-source 3D generation tools
    // For now, return a mock response indicating the feature is available
    return {
      success: true,
      message: `3D mesh generation request received: ${description} (${type}, ${complexity} detail)`,
      download_url: null,
      status: 'coming_soon',
      provider: 'open3d-future'
    };
  }
}

export const freeAIService = FreeAIService.getInstance();