import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { StorageManager } from '../storage/manager.js';
import { AnalysisEngine } from '../analysis/engine.js';

export class MCPProtocolHandler {
  private server: Server;
  private storage: StorageManager;
  private analysis: AnalysisEngine;

  constructor(storage: StorageManager, analysis: AnalysisEngine) {
    this.storage = storage;
    this.analysis = analysis;
    this.server = new Server({
      name: 'mcp-prompt-collector',
      version: '1.0.0',
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle resources/list requests
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [],
      };
    });

    // Handle prompts/list requests  
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [],
      };
    });
    
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'log_prompt',
            description: 'Log and analyze a prompt for quality insights. Use this to track your prompting patterns and get improvement suggestions.',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The prompt you want to log and analyze',
                },
                context: {
                  type: 'string',
                  description: 'Optional context about what you\'re trying to achieve',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional tags to categorize this prompt (e.g., "coding", "writing", "analysis")',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'get_prompt_insights',
            description: 'Get insights and suggestions for improving your prompts based on your history',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Optional category to focus on (e.g., "coding", "writing")',
                },
                limit: {
                  type: 'number',
                  description: 'Number of recent prompts to analyze (default: 20)',
                },
              },
            },
          },
          {
            name: 'improve_prompt',
            description: 'Analyze a prompt and get specific suggestions for improvement',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The prompt you want to improve',
                },
                goal: {
                  type: 'string',
                  description: 'What you\'re trying to achieve with this prompt',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'view_stats',
            description: 'View your prompting statistics and quality trends',
            inputSchema: {
              type: 'object',
              properties: {
                days: {
                  type: 'number',
                  description: 'Number of days to include in stats (default: 30)',
                },
              },
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'log_prompt':
          return await this.handleLogPrompt(args);
        case 'get_prompt_insights':
          return await this.handleGetInsights(args);
        case 'improve_prompt':
          return await this.handleImprovePrompt(args);
        case 'view_stats':
          return await this.handleViewStats(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleLogPrompt(args: any) {
    try {
      const { prompt, context, tags } = args;

      // Store the prompt
      const promptId = await this.storage.savePrompt({
        content: prompt,
        context,
        metadata: { tags: tags || [] },
      });

      // Analyze the prompt
      const analysis = await this.analysis.analyzePrompt(prompt);
      await this.storage.updatePromptAnalysis(
        promptId,
        analysis.qualityScore,
        analysis.complexity,
        analysis.suggestedTechnique
      );

      return {
        content: [
          {
            type: 'text',
            text: `✅ Prompt logged and analyzed!\n\n**Quality Score:** ${analysis.qualityScore}/10\n**Complexity:** ${analysis.complexity}\n**Suggested Technique:** ${analysis.suggestedTechnique}\n**Rationale:** ${analysis.techniqueRationale}\n\n${analysis.issues.length > 0 ? `**Issues Found:**\n${analysis.issues.map(issue => `• ${issue.description} (${issue.severity})`).join('\n')}` : '**No issues found!**'}\n\nPrompt ID: ${promptId}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error logging prompt:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'Error logging prompt',
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetInsights(args: any) {
    try {
      const { category, limit = 20 } = args;
      
      const prompts = await this.storage.getPrompts(limit, 0);
      
      if (prompts.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No prompts found. Use the `log_prompt` tool to start tracking your prompts!',
            },
          ],
        };
      }

      const avgQuality = prompts
        .filter(p => p.qualityScore)
        .reduce((sum, p) => sum + p.qualityScore!, 0) / prompts.filter(p => p.qualityScore).length;

      const complexityDistribution = prompts.reduce((acc, p) => {
        if (p.complexity) {
          acc[p.complexity] = (acc[p.complexity] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const commonIssues = prompts
        .filter(p => p.qualityScore && p.qualityScore < 7)
        .slice(0, 5);

      return {
        content: [
          {
            type: 'text',
            text: `📊 **Prompt Insights** (Last ${prompts.length} prompts)\n\n**Average Quality:** ${avgQuality.toFixed(1)}/10\n\n**Complexity Distribution:**\n${Object.entries(complexityDistribution).map(([complexity, count]) => `• ${complexity}: ${count} prompts`).join('\n')}\n\n${commonIssues.length > 0 ? `**Prompts needing improvement:**\n${commonIssues.map(p => `• "${p.content.substring(0, 60)}..." (Score: ${p.qualityScore}/10)`).join('\n')}` : '**All recent prompts look good!**'}\n\n💡 Use \`improve_prompt\` to get specific suggestions for any prompt.`,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting insights:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'Error getting insights',
          },
        ],
        isError: true,
      };
    }
  }

  private async handleImprovePrompt(args: any) {
    try {
      const { prompt, goal } = args;

      const analysis = await this.analysis.analyzePrompt(prompt);

      let suggestions = [
        `**Current Quality Score:** ${analysis.qualityScore}/10`,
        `**Complexity:** ${analysis.complexity}`,
        `**Suggested Technique:** ${analysis.suggestedTechnique}`,
      ];

      if (analysis.issues.length > 0) {
        suggestions.push('\n**Issues to fix:**');
        analysis.issues.forEach(issue => {
          suggestions.push(`• **${issue.type}** (${issue.severity}): ${issue.description}`);
        });
      }

      suggestions.push('\n**Improvement suggestions:**');
      
      if (!analysis.structure.hasContext) {
        suggestions.push('• Add more context about your situation or what you\'re working on');
      }
      
      if (!analysis.structure.hasExamples) {
        suggestions.push('• Include examples of what you\'re looking for');
      }
      
      if (!analysis.structure.hasConstraints) {
        suggestions.push('• Specify any constraints or requirements');
      }
      
      if (!analysis.structure.hasExpectedOutput) {
        suggestions.push('• Clearly state what format or type of response you want');
      }

      if (goal) {
        suggestions.push(`\n**For your goal of "${goal}":**`);
        suggestions.push('• Consider being more specific about the outcome you want to achieve');
      }

      return {
        content: [
          {
            type: 'text',
            text: `🔍 **Prompt Analysis**\n\n${suggestions.join('\n')}\n\n💡 **Tip:** ${analysis.techniqueRationale}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error improving prompt:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'Error analyzing prompt',
          },
        ],
        isError: true,
      };
    }
  }

  private async handleViewStats(args: any) {
    try {
      const { days = 30 } = args;
      
      const prompts = await this.storage.getPrompts(1000, 0);
      const qualityMetrics = await this.storage.getQualityMetrics(days);
      
      const totalPrompts = prompts.length;
      const avgQuality = prompts
        .filter(p => p.qualityScore)
        .reduce((sum, p) => sum + p.qualityScore!, 0) / prompts.filter(p => p.qualityScore).length || 0;

      const complexityStats = prompts.reduce((acc, p) => {
        if (p.complexity) {
          acc[p.complexity] = (acc[p.complexity] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        content: [
          {
            type: 'text',
            text: `📈 **Your Prompting Statistics**\n\n**Total Prompts Logged:** ${totalPrompts}\n**Average Quality Score:** ${avgQuality.toFixed(1)}/10\n\n**Complexity Breakdown:**\n${Object.entries(complexityStats).map(([complexity, count]) => `• ${complexity}: ${count} (${((count/totalPrompts)*100).toFixed(1)}%)`).join('\n')}\n\n**Quality Trends (Last ${days} days):**\n${qualityMetrics.length > 0 ? qualityMetrics.slice(0, 5).map(m => `• ${m.date}: ${m.averageQuality.toFixed(1)}/10 (${m.count} prompts)`).join('\n') : 'No data available'}\n\n🎯 View detailed analytics at: http://localhost:3456`,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'Error getting statistics',
          },
        ],
        isError: true,
      };
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Use stderr for logging in MCP context (stdout is reserved for JSON-RPC)
    console.error('MCP Protocol Handler started');
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}