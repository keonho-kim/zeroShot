export interface AppConfig {
  bootstrapRoots: string[];
  allowedRoots: string[];
  resourceRoots: {
    skills: string;
    designTemplates: string;
    designSystems: string;
  };
  server: {
    host: string;
    port: number;
  };
  defaults: {
    approval: string;
    sandbox: string;
    maxIters: number;
    stallLimit: number;
    planReasoning: string;
    execReasoning: string;
    validateReasoning: string;
    closeoutReasoning: string;
  };
}
