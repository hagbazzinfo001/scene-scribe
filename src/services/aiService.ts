import { supabase } from "@/integrations/supabase/client";

export interface AIServiceOptions {
  provider?: 'openai' | 'llama' | 'claude' | 'mistral';
  model?: string;
  endpoint?: string;
  fallbackProvider?: 'openai' | 'claude';
}

export interface AIUsageMetrics {
  tokensUsed: number;
  costEstimate: number;
  responseTimeMs: number;
  success: boolean;
  errorType?: string;
}

export class AIService {
  private static instance: AIService;
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async callAI(
    endpoint: string,
    data: any,
    options: AIServiceOptions = {}
  ): Promise<{ data: any; metrics: AIUsageMetrics }> {
    const startTime = Date.now();
    const provider = options.provider || 'openai';
    const model = options.model || 'gpt-4o-mini';
    
    try {
      console.log(`AI Service: Calling ${endpoint} with provider ${provider}`);
      
      // Route to appropriate AI provider
      const result = await this.routeToProvider(endpoint, data, provider, model);
      
      const responseTime = Date.now() - startTime;
      const metrics: AIUsageMetrics = {
        tokensUsed: result.usage?.total_tokens || 0,
        costEstimate: this.calculateCost(provider, model, result.usage?.total_tokens || 0),
        responseTimeMs: responseTime,
        success: true
      };

      // Track usage for migration planning
      await this.trackUsage(endpoint, provider, model, metrics, data.projectId);

      return { data: result.data, metrics };
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const metrics: AIUsageMetrics = {
        tokensUsed: 0,
        costEstimate: 0,
        responseTimeMs: responseTime,
        success: false,
        errorType: error.message
      };

      await this.trackUsage(endpoint, provider, model, metrics, data.projectId);
      
      // Try fallback if configured
      if (options.fallbackProvider && options.fallbackProvider !== provider) {
        console.log(`AI Service: Falling back to ${options.fallbackProvider}`);
        return this.callAI(endpoint, data, { ...options, provider: options.fallbackProvider, fallbackProvider: undefined });
      }
      
      throw error;
    }
  }

  private async routeToProvider(endpoint: string, data: any, provider: string, model: string) {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(endpoint, data, model);
      case 'llama':
        return this.callLlama(endpoint, data, model);
      case 'claude':
        return this.callClaude(endpoint, data, model);
      case 'mistral':
        return this.callMistral(endpoint, data, model);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  private async callOpenAI(endpoint: string, data: any, model: string) {
    // For now, call existing edge functions
    const { data: result, error } = await supabase.functions.invoke(endpoint, {
      body: { ...data, aiProvider: 'openai', aiModel: model }
    });
    
    if (error) throw error;
    return { data: result, usage: result.usage };
  }

  private async callLlama(endpoint: string, data: any, model: string) {
    // TODO: Implement LLaMA routing when self-hosted is ready
    // For now, fallback to OpenAI
    console.log('LLaMA not implemented yet, falling back to OpenAI');
    return this.callOpenAI(endpoint, data, 'gpt-4o-mini');
  }

  private async callClaude(endpoint: string, data: any, model: string) {
    // TODO: Implement Claude routing
    console.log('Claude not implemented yet, falling back to OpenAI');
    return this.callOpenAI(endpoint, data, 'gpt-4o-mini');
  }

  private async callMistral(endpoint: string, data: any, model: string) {
    // TODO: Implement Mistral routing
    console.log('Mistral not implemented yet, falling back to OpenAI');
    return this.callOpenAI(endpoint, data, 'gpt-4o-mini');
  }

  private calculateCost(provider: string, model: string, tokens: number): number {
    // Cost estimation per 1K tokens (rough estimates)
    const costPer1kTokens: Record<string, Record<string, number>> = {
      openai: {
        'gpt-4o': 0.03,
        'gpt-4o-mini': 0.0001,
        'gpt-4': 0.03
      },
      llama: {
        'llama-3-8b': 0.0001,  // Estimated self-hosted cost
        'llama-3-70b': 0.0008
      }
    };

    const rate = costPer1kTokens[provider]?.[model] || 0.01;
    return (tokens / 1000) * rate;
  }

  private async trackUsage(
    endpoint: string, 
    provider: string, 
    model: string, 
    metrics: AIUsageMetrics,
    projectId?: string
  ) {
    try {
      // Ensure we never send an invalid UUID to the DB
      const isValidUUID = (id?: string) =>
        !!id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

      const safeProjectId = isValidUUID(projectId) ? projectId : null;

      await supabase.from('ai_usage_analytics').insert({
        provider,
        model,
        endpoint,
        tokens_used: metrics.tokensUsed,
        cost_estimate: metrics.costEstimate,
        response_time_ms: metrics.responseTimeMs,
        success: metrics.success,
        error_type: metrics.errorType,
        project_id: safeProjectId
      });
    } catch (error) {
      console.error('Failed to track AI usage:', error);
    }
  }

  // Helper methods for easy access
  async analyzeScript(scriptContent: string, scriptId: string, projectId: string, options?: AIServiceOptions) {
    return this.callAI('script-analyzer', { scriptContent, scriptId, projectId }, options);
  }

  async planVFX(sceneDescription: string, vfxType: string, projectId: string, options?: AIServiceOptions) {
    return this.callAI('vfx-planner', { sceneDescription, vfxType, projectId }, options);
  }

  async planRigging(characterType: string, animationStyle: string, rigComplexity: string, projectId: string, options?: AIServiceOptions) {
    return this.callAI('auto-rigger', { characterType, animationStyle, rigComplexity, projectId }, options);
  }

  async chatAssistant(message: string, projectId?: string, options?: AIServiceOptions) {
    return this.callAI('ai-assistant-enhanced', { message, projectId }, {
      provider: 'openai',
      model: 'gpt-5-2025-08-07',
      endpoint: 'ai-assistant-enhanced',
      ...options
    });
  }

  // Migration helper methods
  async getUsageReport(startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('ai_usage_analytics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return this.generateUsageReport(data);
  }

  private generateUsageReport(data: any[]) {
    const totalTokens = data.reduce((sum, record) => sum + record.tokens_used, 0);
    const totalCost = data.reduce((sum, record) => sum + parseFloat(record.cost_estimate), 0);
    const avgResponseTime = data.reduce((sum, record) => sum + record.response_time_ms, 0) / data.length;
    
    const byProvider = data.reduce((acc, record) => {
      if (!acc[record.provider]) {
        acc[record.provider] = { tokens: 0, cost: 0, requests: 0 };
      }
      acc[record.provider].tokens += record.tokens_used;
      acc[record.provider].cost += parseFloat(record.cost_estimate);
      acc[record.provider].requests += 1;
      return acc;
    }, {});

    const byEndpoint = data.reduce((acc, record) => {
      if (!acc[record.endpoint]) {
        acc[record.endpoint] = { tokens: 0, cost: 0, requests: 0 };
      }
      acc[record.endpoint].tokens += record.tokens_used;
      acc[record.endpoint].cost += parseFloat(record.cost_estimate);
      acc[record.endpoint].requests += 1;
      return acc;
    }, {});

    return {
      totalTokens,
      totalCost,
      avgResponseTime: Math.round(avgResponseTime),
      totalRequests: data.length,
      successRate: data.filter(r => r.success).length / data.length,
      byProvider,
      byEndpoint,
      costPerRequest: totalCost / data.length,
      migrationRecommendation: this.getMigrationRecommendation(totalCost, data.length)
    };
  }

  private getMigrationRecommendation(totalCost: number, totalRequests: number): string {
    const costPerRequest = totalCost / totalRequests;
    
    if (totalRequests < 1000) {
      return "Keep using hosted APIs - not enough volume for self-hosting";
    } else if (costPerRequest > 0.01) {
      return "Consider migrating high-volume endpoints to LLaMA - potential 50-70% cost savings";
    } else if (totalCost > 500) {
      return "Strong candidate for full migration to self-hosted LLaMA";
    } else {
      return "Monitor usage - consider hybrid approach";
    }
  }
}

export const aiService = AIService.getInstance();