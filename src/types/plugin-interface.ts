export type JobRow = {
  id: string;
  project_id?: string | null;
  user_id: string;
  type: string;
  status: string;
  payload: any;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
};

export type PluginRunResult = {
  jobId: string;
  status: "pending" | "running" | "done" | "error";
  result?: any;
  error?: string;
};

export interface Plugin {
  id: string;
  name: string;
  validateInput(payload: any): Promise<{ valid: boolean; errors?: string[] }>;
  runModel(job: JobRow, params?: any): Promise<PluginRunResult>;
  poll?(jobId: string): Promise<PluginRunResult>;
  finalize?(job: JobRow, result: any): Promise<void>;
}

export interface PluginConfig {
  id: string;
  name: string;
  defaultModel: string;
  paramsSchema: Record<string, any>;
  enabled: boolean;
}