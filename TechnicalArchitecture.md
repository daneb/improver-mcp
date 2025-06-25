# MCP Prompt Collector - Technical Architecture Document

## 1. System Overview

### 1.1 Architecture Diagram

```
┌─────────────────────┐
│   Claude Desktop    │
│  (Electron App)     │
└──────────┬──────────┘
           │ MCP Protocol
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   MCP Server        │────▶│   SQLite Database   │
│  (Node.js/TS)       │     │  (prompt_history.db)│
└──────────┬──────────┘     └─────────────────────┘
           │                            ▲
           ▼                            │
┌─────────────────────┐                 │
│   Analysis Engine   │─────────────────┘
│  (Adapted from      │
│   Improver)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Web Dashboard     │────▶│   Analytics Engine  │
│  (Express + React)  │     │  (Background Worker)│
└─────────────────────┘     └─────────────────────┘
```

### 1.2 Component Overview

1. **MCP Server Core**: Handles communication with Claude Desktop
2. **Storage Layer**: SQLite database for all persistent data
3. **Analysis Engine**: Adapted from Improver for prompt quality assessment
4. **Web Dashboard**: Local web interface for viewing analytics
5. **Background Worker**: Periodic analysis and insight generation

## 2. Detailed Component Design

### 2.1 MCP Server Core

```typescript
// src/server/index.ts
interface MCPServer {
  // MCP Protocol Implementation
  initialize(): Promise<void>;
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  shutdown(): Promise<void>;

  // Prompt Interception
  interceptPrompt(prompt: PromptData): Promise<PromptData>;
  interceptResponse(response: ResponseData): Promise<void>;
}

// MCP Protocol Messages
interface PromptData {
  id: string;
  timestamp: Date;
  content: string;
  context?: string;
  metadata?: Record<string, any>;
}

interface ResponseData {
  id: string;
  promptId: string;
  content: string;
  timestamp: Date;
  tokensUsed?: number;
}
```

**Key Features:**

- Implements MCP protocol specification
- Minimal latency (<50ms) for prompt processing
- Non-blocking architecture using async/await
- Graceful error handling to never interrupt Claude

### 2.2 Database Schema

```sql
-- Core Tables
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  context TEXT,
  conversation_id TEXT,
  quality_score REAL,
  complexity TEXT CHECK(complexity IN ('simple', 'moderate', 'complex')),
  technique_used TEXT,
  metadata JSON
);

CREATE TABLE responses (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  tokens_used INTEGER,
  user_rating INTEGER CHECK(user_rating BETWEEN 1 AND 5),
  FOREIGN KEY (prompt_id) REFERENCES prompts(id)
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  title TEXT,
  summary TEXT,
  total_prompts INTEGER DEFAULT 0,
  average_quality REAL
);

CREATE TABLE insights (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  type TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('info', 'suggestion', 'warning')),
  title TEXT NOT NULL,
  description TEXT,
  evidence JSON,
  prompt_ids JSON,
  acknowledged BOOLEAN DEFAULT FALSE
);

CREATE TABLE metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  metadata JSON,
  UNIQUE(date, metric_name)
);

-- Indexes for performance
CREATE INDEX idx_prompts_timestamp ON prompts(timestamp);
CREATE INDEX idx_prompts_conversation ON prompts(conversation_id);
CREATE INDEX idx_prompts_quality ON prompts(quality_score);
CREATE INDEX idx_responses_prompt ON responses(prompt_id);
CREATE INDEX idx_insights_type ON insights(type);
CREATE INDEX idx_metrics_date ON metrics(date);
```

### 2.3 Analysis Engine

```typescript
// src/analysis/engine.ts
interface AnalysisEngine {
  // Quality Assessment
  analyzePrompt(prompt: string): Promise<PromptAnalysis>;
  comparePrompts(before: string, after: string): Promise<Comparison>;

  // Pattern Detection
  detectPatterns(prompts: Prompt[]): Promise<Pattern[]>;
  identifyWeaknesses(prompts: Prompt[]): Promise<Weakness[]>;

  // Improvement Suggestions
  suggestImprovements(analysis: PromptAnalysis): Promise<Suggestion[]>;
  generateTemplate(pattern: Pattern): Promise<PromptTemplate>;
}

interface PromptAnalysis {
  quality_score: number; // 0-10
  complexity: "simple" | "moderate" | "complex";
  structure: {
    has_context: boolean;
    has_examples: boolean;
    has_constraints: boolean;
    has_expected_output: boolean;
    clarity_score: number;
  };
  issues: {
    type:
      | "ambiguity"
      | "missing_context"
      | "too_broad"
      | "bias"
      | "inefficiency";
    description: string;
    severity: "low" | "medium" | "high";
  }[];
  suggested_technique: string;
  technique_rationale: string;
}

// Adapted from Improver's technique detection
class TechniqueSelector {
  private techniques = {
    simple: ["Zero-Shot", "Direct Question"],
    moderate: ["Few-Shot", "Chain of Thought", "Role-Based"],
    complex: ["Tree of Thoughts", "ReAct", "Multi-Step Reasoning"],
  };

  async selectTechnique(analysis: PromptAnalysis): Promise<string> {
    // Implementation adapted from Improver
  }
}
```

### 2.4 Web Dashboard Architecture

```typescript
// src/dashboard/server.ts
interface DashboardServer {
  // API Endpoints
  GET /api/prompts          // List prompts with pagination
  GET /api/prompts/:id      // Get specific prompt details
  GET /api/analytics        // Get analytics data
  GET /api/insights         // Get current insights
  GET /api/metrics          // Get historical metrics
  POST /api/prompts/:id/rate // Rate a response

  // WebSocket for real-time updates
  WS /ws/live              // Live prompt feed
}

// Frontend Structure
src/dashboard/client/
├── components/
│   ├── PromptHistory.tsx
│   ├── AnalyticsDashboard.tsx
│   ├── InsightCards.tsx
│   ├── QualityTrends.tsx
│   └── ImprovementSuggestions.tsx
├── hooks/
│   ├── usePrompts.ts
│   ├── useAnalytics.ts
│   └── useLiveUpdates.ts
└── pages/
    ├── Overview.tsx
    ├── History.tsx
    ├── Analytics.tsx
    └── Settings.tsx
```

### 2.5 Background Worker

```typescript
// src/worker/analyzer.ts
interface BackgroundAnalyzer {
  // Scheduled Tasks
  runDailyAnalysis(): Promise<void>;
  generateWeeklyReport(): Promise<Report>;
  cleanupOldData(): Promise<void>;

  // Pattern Analysis
  analyzeRecentPatterns(): Promise<void>;
  updateQualityMetrics(): Promise<void>;
  generateInsights(): Promise<void>;
}

// Cron Schedule
const schedule = {
  "0 2 * * *": "runDailyAnalysis", // 2 AM daily
  "0 9 * * 1": "generateWeeklyReport", // 9 AM Monday
  "0 3 * * *": "cleanupOldData", // 3 AM daily
};
```

## 3. Integration Points

### 3.1 MCP Protocol Implementation

```typescript
// src/mcp/protocol.ts
class MCPProtocolHandler {
  async handleMessage(message: MCPMessage): Promise<MCPResponse> {
    switch (message.type) {
      case "prompt":
        return this.handlePrompt(message);
      case "response":
        return this.handleResponse(message);
      case "config":
        return this.handleConfig(message);
      default:
        return { type: "error", message: "Unknown message type" };
    }
  }

  private async handlePrompt(message: PromptMessage): Promise<MCPResponse> {
    // 1. Store prompt
    const promptId = await this.storage.savePrompt(message);

    // 2. Analyze prompt (async, non-blocking)
    this.analysis.analyzePrompt(message.content).then((analysis) => {
      this.storage.updatePromptAnalysis(promptId, analysis);
    });

    // 3. Optionally enhance (if enabled)
    if (this.config.enhancePrompts) {
      const enhanced = await this.enhancer.enhance(message.content);
      return { type: "prompt", content: enhanced, original: message.content };
    }

    // 4. Return original (no modification)
    return { type: "prompt", content: message.content };
  }
}
```

### 3.2 Configuration File

```json
// mcp-config.json
{
  "name": "prompt-collector",
  "version": "1.0.0",
  "protocol": "mcp/1.0",
  "capabilities": {
    "intercept": true,
    "modify": true,
    "store": true
  },
  "settings": {
    "enhancePrompts": false,
    "storageLocation": "~/.mcp-prompt-collector/data",
    "dashboardPort": 3456,
    "analysisLevel": "detailed",
    "retentionDays": 90
  }
}
```

## 4. Security & Privacy

### 4.1 Data Security

```typescript
// src/security/encryption.ts
interface SecurityManager {
  // Encryption for sensitive data
  encryptPrompt(prompt: string): Promise<string>;
  decryptPrompt(encrypted: string): Promise<string>;

  // Access control
  validateAccess(token: string): Promise<boolean>;
  generateAccessToken(): Promise<string>;

  // Data sanitization
  sanitizeForStorage(data: any): any;
  sanitizeForDisplay(data: any): any;
}
```

### 4.2 Privacy Features

- **Local-only storage**: No cloud sync
- **Data retention policies**: Automatic cleanup after X days
- **Export controls**: User can export/delete all data
- **Opt-in enhancement**: Prompt modification off by default

## 5. Performance Optimization

### 5.1 Caching Strategy

```typescript
// src/cache/manager.ts
interface CacheManager {
  // In-memory caches
  promptCache: LRUCache<string, PromptAnalysis>;
  metricCache: LRUCache<string, Metric[]>;
  insightCache: Set<Insight>;

  // Cache warming
  warmCache(): Promise<void>;
  invalidate(key: string): Promise<void>;
}
```

### 5.2 Database Optimization

- **Batch operations**: Group inserts/updates
- **Connection pooling**: Reuse database connections
- **Prepared statements**: Prevent SQL injection, improve performance
- **Periodic VACUUM**: Maintain database efficiency

## 6. Deployment & Installation

### 6.1 Installation Process

```bash
# NPM Global Installation
npm install -g mcp-prompt-collector

# Or local installation
git clone https://github.com/daneb/mcp-prompt-collector
cd mcp-prompt-collector
npm install
npm run build
npm link

# Configure Claude Desktop
mcp-prompt-collector setup
```

### 6.2 Directory Structure

```
~/.mcp-prompt-collector/
├── data/
│   └── prompt_history.db
├── logs/
│   └── mcp-server.log
├── config/
│   └── settings.json
└── cache/
    └── analytics.cache
```

## 7. Error Handling & Monitoring

### 7.1 Error Handling Strategy

```typescript
// src/errors/handler.ts
class ErrorHandler {
  async handle(error: Error, context: ErrorContext): Promise<void> {
    // 1. Log error
    await this.logger.error(error, context);

    // 2. Determine if recoverable
    if (this.isRecoverable(error)) {
      await this.recover(error, context);
    }

    // 3. Never interrupt Claude Desktop
    if (context.source === "prompt-interception") {
      return; // Fail silently
    }

    // 4. Notify dashboard if connected
    this.notifyDashboard(error);
  }
}
```

### 7.2 Monitoring & Logging

- **Structured logging**: JSON format for easy parsing
- **Log levels**: ERROR, WARN, INFO, DEBUG
- **Performance metrics**: Track latency, memory usage
- **Health checks**: Endpoint for monitoring

## 8. Testing Strategy

### 8.1 Test Structure

```
test/
├── unit/
│   ├── analysis.test.ts
│   ├── storage.test.ts
│   └── mcp-protocol.test.ts
├── integration/
│   ├── claude-integration.test.ts
│   └── dashboard.test.ts
└── fixtures/
    └── sample-prompts.json
```

### 8.2 Test Coverage Goals

- **Unit tests**: >90% coverage
- **Integration tests**: Critical paths
- **Performance tests**: <50ms latency requirement
- **Load tests**: 10,000+ prompts

## 9. Future Architecture Considerations

### 9.1 Extensibility Points

- **Plugin system**: Custom analysis rules
- **Export adapters**: Various format outputs
- **Integration APIs**: Connect with other tools
- **Theme system**: Custom dashboard themes

### 9.2 Scalability Planning

- **Sharding**: Split database by date ranges
- **Archival**: Move old data to compressed storage
- **Streaming**: Handle large result sets
- **Worker pools**: Parallel analysis processing

## 10. Development Workflow

### 10.1 Build Pipeline

```yaml
# .github/workflows/build.yml
steps:
  - lint: ESLint + Prettier
  - test: Jest unit + integration
  - build: TypeScript compilation
  - package: Create distributables
  - release: npm publish + GitHub release
```

### 10.2 Release Process

1. Version bump (semantic versioning)
2. Update CHANGELOG.md
3. Run full test suite
4. Build and package
5. Create GitHub release
6. Publish to npm
7. Update documentation

## 11. Sample Implementation

### 11.1 MCP Server Entry Point

```typescript
// src/index.ts
import { MCPServer } from "./server";
import { AnalysisEngine } from "./analysis/engine";
import { StorageManager } from "./storage/manager";
import { DashboardServer } from "./dashboard/server";
import { BackgroundWorker } from "./worker";

async function main() {
  // Initialize components
  const storage = new StorageManager();
  const analysis = new AnalysisEngine();
  const mcp = new MCPServer(storage, analysis);
  const dashboard = new DashboardServer(storage);
  const worker = new BackgroundWorker(storage, analysis);

  // Start services
  await storage.initialize();
  await mcp.start();
  await dashboard.start(3456);
  await worker.start();

  console.log("MCP Prompt Collector started successfully");
}

main().catch(console.error);
```

### 11.2 Prompt Quality Metrics

```typescript
// src/analysis/metrics.ts
export class QualityMetrics {
  calculateScore(analysis: PromptAnalysis): number {
    let score = 10;

    // Deduct for missing elements
    if (!analysis.structure.has_context) score -= 2;
    if (!analysis.structure.has_examples) score -= 1;
    if (!analysis.structure.has_constraints) score -= 1;
    if (!analysis.structure.has_expected_output) score -= 1;

    // Deduct for issues
    analysis.issues.forEach((issue) => {
      switch (issue.severity) {
        case "high":
          score -= 2;
          break;
        case "medium":
          score -= 1;
          break;
        case "low":
          score -= 0.5;
          break;
      }
    });

    // Add bonus for clarity
    score += (analysis.structure.clarity_score / 10) * 2;

    return Math.max(0, Math.min(10, score));
  }
}
```

## 12. Conclusion

This architecture provides a robust foundation for the MCP Prompt Collector that:

1. **Integrates seamlessly** with Claude Desktop via MCP protocol
2. **Leverages existing work** from the Improver project
3. **Maintains performance** with <50ms latency
4. **Protects privacy** with local-only storage
5. **Provides insights** through comprehensive analytics
6. **Scales efficiently** to handle thousands of prompts

The modular design allows for incremental development and easy maintenance while providing a clear path for future enhancements.
