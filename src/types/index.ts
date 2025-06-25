export interface PromptData {
  id: string;
  content: string;
  timestamp: Date;
  context?: string;
  conversationId?: string;
  qualityScore?: number;
  complexity?: 'simple' | 'moderate' | 'complex';
  techniqueUsed?: string;
  metadata?: Record<string, any>;
}

export interface ResponseData {
  id: string;
  promptId: string;
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  userRating?: number;
}

export interface ConversationData {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  title?: string;
  summary?: string;
  totalPrompts: number;
  averageQuality?: number;
}

export interface InsightData {
  id: string;
  createdAt: Date;
  type: string;
  severity: 'info' | 'suggestion' | 'warning';
  title: string;
  description?: string;
  evidence?: Record<string, any>;
  promptIds?: string[];
  acknowledged: boolean;
}

export interface MetricData {
  id: number;
  date: string;
  metricName: string;
  metricValue: number;
  metadata?: Record<string, any>;
}

export interface PromptAnalysis {
  qualityScore: number;
  complexity: 'simple' | 'moderate' | 'complex';
  structure: {
    hasContext: boolean;
    hasExamples: boolean;
    hasConstraints: boolean;
    hasExpectedOutput: boolean;
    clarityScore: number;
  };
  issues: Array<{
    type: 'ambiguity' | 'missing_context' | 'too_broad' | 'bias' | 'inefficiency';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  suggestedTechnique: string;
  techniqueRationale: string;
}

export interface MCPConfig {
  name: string;
  version: string;
  protocol: string;
  capabilities: {
    intercept: boolean;
    modify: boolean;
    store: boolean;
  };
  settings: {
    enhancePrompts: boolean;
    storageLocation: string;
    dashboardPort: number;
    analysisLevel: string;
    retentionDays: number;
  };
}