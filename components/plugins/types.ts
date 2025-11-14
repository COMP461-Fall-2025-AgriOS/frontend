export interface Plugin {
  id: string;
  status: 'available' | 'loaded' | 'enabled';
  hasSource: boolean;
}

export interface CompileResult {
  success: boolean;
  output: string;
  errors?: string;
}

export interface PluginInvocation {
  pluginId: string;
  context: string;
}

