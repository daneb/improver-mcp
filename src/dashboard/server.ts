import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { StorageManager } from '../storage/manager.js';
import { AnalysisEngine } from '../analysis/engine.js';
import { InsightsGenerator } from '../analysis/insights.js';

export class DashboardServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer | undefined;
  private storage: StorageManager;
  private analysis: AnalysisEngine;
  private insights: InsightsGenerator;
  private port: number;
  private isRunning = false;

  constructor(storage: StorageManager, port = 3456) {
    this.storage = storage;
    this.analysis = new AnalysisEngine();
    this.insights = new InsightsGenerator(storage);
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // API Routes
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    this.app.get('/api/prompts', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const prompts = await this.storage.getPrompts(limit, offset);
        res.json({ prompts, total: prompts.length });
      } catch (error) {
        console.error('Error fetching prompts:', error);
        res.status(500).json({ error: 'Failed to fetch prompts' });
      }
    });

    this.app.get('/api/prompts/:id', async (req, res) => {
      try {
        const prompt = await this.storage.getPromptById(req.params.id);
        if (!prompt) {
          return res.status(404).json({ error: 'Prompt not found' });
        }
        
        const responses = await this.storage.getResponsesByPromptId(req.params.id);
        res.json({ prompt, responses });
      } catch (error) {
        console.error('Error fetching prompt:', error);
        res.status(500).json({ error: 'Failed to fetch prompt' });
      }
    });

    this.app.get('/api/analytics/quality-trends', async (req, res) => {
      try {
        const days = parseInt(req.query.days as string) || 30;
        const metrics = await this.storage.getQualityMetrics(days);
        res.json({ metrics });
      } catch (error) {
        console.error('Error fetching quality trends:', error);
        res.status(500).json({ error: 'Failed to fetch quality trends' });
      }
    });

    this.app.get('/api/insights', async (req, res) => {
      try {
        const insights = await this.storage.getUnacknowledgedInsights();
        res.json({ insights });
      } catch (error) {
        console.error('Error fetching insights:', error);
        res.status(500).json({ error: 'Failed to fetch insights' });
      }
    });

    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.getBasicStats();
        res.json(stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
      }
    });

    // Test endpoint for creating sample prompts
    this.app.post('/api/test-prompt', async (req, res) => {
      try {
        const { prompt, context, conversationId } = req.body;
        
        // Save the prompt
        const promptId = await this.storage.savePrompt({
          content: prompt,
          context,
          conversationId,
        });

        // Run real analysis
        const analysis = await this.analysis.analyzePrompt(prompt);

        await this.storage.updatePromptAnalysis(
          promptId,
          analysis.qualityScore,
          analysis.complexity,
          analysis.suggestedTechnique
        );

        res.json({ 
          success: true, 
          promptId, 
          message: 'Test prompt created and analyzed',
          analysis 
        });
      } catch (error) {
        console.error('Error creating test prompt:', error);
        res.status(500).json({ error: 'Failed to create test prompt' });
      }
    });

    // Test endpoint for generating insights
    this.app.post('/api/generate-insights', async (req, res) => {
      try {
        const insights = await this.insights.generateInsights();
        res.json({ 
          success: true, 
          insights: insights.length,
          data: insights 
        });
      } catch (error) {
        console.error('Error generating insights:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
      }
    });

    // Serve the dashboard HTML
    this.app.get('/', (req, res) => {
      res.send(this.getDashboardHTML());
    });

    // Catch-all route for SPA
    this.app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
      } else {
        res.send(this.getDashboardHTML());
      }
    });
  }

  private async getBasicStats() {
    // This is a simplified version - in a real implementation, you'd have proper aggregation queries
    const recentPrompts = await this.storage.getPrompts(1000, 0);
    const totalPrompts = recentPrompts.length;
    const qualityScores = recentPrompts
      .filter(p => p.qualityScore !== undefined)
      .map(p => p.qualityScore!);
    
    const averageQuality = qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0;

    // Calculate today's prompts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPrompts = recentPrompts.filter(p => {
      const promptDate = new Date(p.timestamp);
      promptDate.setHours(0, 0, 0, 0);
      return promptDate.getTime() === today.getTime();
    }).length;

    const complexityDistribution = recentPrompts.reduce((acc, prompt) => {
      if (prompt.complexity) {
        acc[prompt.complexity] = (acc[prompt.complexity] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPrompts,
      todayPrompts,
      averageQuality: Math.round(averageQuality * 10) / 10,
      complexityDistribution,
      recentActivity: recentPrompts.slice(0, 10).map(p => ({
        id: p.id,
        timestamp: p.timestamp,
        qualityScore: p.qualityScore,
        complexity: p.complexity,
      })),
    };
  }

  private getDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Prompt Collector Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #007AFF;
        }
        
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        
        .prompts-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .prompt-item {
            border-bottom: 1px solid #eee;
            padding: 15px 0;
        }
        
        .prompt-item:last-child {
            border-bottom: none;
        }
        
        .prompt-content {
            font-size: 0.9em;
            margin-bottom: 8px;
            max-height: 60px;
            overflow: hidden;
        }
        
        .prompt-meta {
            font-size: 0.8em;
            color: #666;
            display: flex;
            gap: 15px;
        }
        
        .quality-score {
            color: #28a745;
            font-weight: bold;
        }
        
        .complexity {
            text-transform: capitalize;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7em;
            background: #e9ecef;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        @media (prefers-color-scheme: dark) {
            body {
                background-color: #1a1a1a;
                color: #e0e0e0;
            }
            
            .header, .stat-card, .prompts-section {
                background: #2d2d2d;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            
            .prompt-item {
                border-bottom-color: #444;
            }
            
            .complexity {
                background: #444;
                color: #e0e0e0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MCP Prompt Collector Dashboard</h1>
            <p>Monitor and analyze your Claude Desktop prompts</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="totalPrompts">-</div>
                <div class="stat-label">Total Prompts</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="averageQuality">-</div>
                <div class="stat-label">Average Quality Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="todayPrompts">-</div>
                <div class="stat-label">Today's Prompts</div>
            </div>
        </div>
        
        <div class="prompts-section">
            <h2>Recent Prompts</h2>
            <div id="promptsList" class="loading">Loading prompts...</div>
        </div>
    </div>

    <script>
        async function loadDashboard() {
            try {
                // Load stats
                const statsResponse = await fetch('/api/stats');
                const stats = await statsResponse.json();
                
                document.getElementById('totalPrompts').textContent = stats.totalPrompts || 0;
                document.getElementById('averageQuality').textContent = stats.averageQuality || 0;
                document.getElementById('todayPrompts').textContent = stats.todayPrompts || 0;
                
                // Load recent prompts
                const promptsResponse = await fetch('/api/prompts?limit=20');
                const promptsData = await promptsResponse.json();
                
                const promptsList = document.getElementById('promptsList');
                
                if (promptsData.prompts && promptsData.prompts.length > 0) {
                    promptsList.innerHTML = promptsData.prompts.map(prompt => {
                        const date = new Date(prompt.timestamp).toLocaleString();
                        const content = prompt.content.length > 100 
                            ? prompt.content.substring(0, 100) + '...'
                            : prompt.content;
                        
                        return \`
                            <div class="prompt-item">
                                <div class="prompt-content">\${content}</div>
                                <div class="prompt-meta">
                                    <span>\${date}</span>
                                    \${prompt.qualityScore ? \`<span class="quality-score">Quality: \${prompt.qualityScore}/10</span>\` : ''}
                                    \${prompt.complexity ? \`<span class="complexity">\${prompt.complexity}</span>\` : ''}
                                </div>
                            </div>
                        \`;
                    }).join('');
                } else {
                    promptsList.innerHTML = '<p>No prompts found. Start using Claude Desktop to see your prompts here!</p>';
                }
                
            } catch (error) {
                console.error('Error loading dashboard:', error);
                document.getElementById('promptsList').innerHTML = 
                    '<div class="error">Error loading dashboard data. Please check if the server is running.</div>';
            }
        }
        
        // Load dashboard on page load
        loadDashboard();
        
        // Refresh every 30 seconds
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>
    `;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = createServer(this.app);
      
      // Setup WebSocket server for real-time updates
      this.wss = new WebSocketServer({ server: this.server });
      this.wss.on('connection', (ws) => {
        console.error('WebSocket client connected');
        
        ws.on('close', () => {
          console.error('WebSocket client disconnected');
        });
      });

      this.server.listen(this.port, (err: any) => {
        if (err) {
          reject(err);
        } else {
          this.isRunning = true;
          console.error(`Dashboard server listening on port ${this.port}`);
          console.error(`Visit http://localhost:${this.port} to view the dashboard`);
          resolve(undefined);
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    return new Promise((resolve) => {
      this.wss?.close();
      this.server?.close(() => {
        this.isRunning = false;
        console.error('Dashboard server stopped');
        resolve(undefined);
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  // Method to broadcast updates to connected WebSocket clients
  broadcastUpdate(data: any): void {
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify(data));
        }
      });
    }
  }
}