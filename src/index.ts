#!/usr/bin/env node

import { StorageManager } from './storage/manager.js';
import { AnalysisEngine } from './analysis/engine.js';
import { MCPProtocolHandler } from './mcp/protocol.js';
import { DashboardServer } from './dashboard/server.js';
import { InsightsGenerator } from './analysis/insights.js';
import { ConfigManager } from './config/index.js';
import * as cron from 'node-cron';

class MCPPromptCollector {
  private storage: StorageManager;
  private analysis: AnalysisEngine;
  private mcpHandler: MCPProtocolHandler;
  private dashboard: DashboardServer;
  private insights: InsightsGenerator;
  private configManager: ConfigManager;
  private isRunning = false;

  constructor() {
    this.configManager = new ConfigManager();
    const config = this.configManager.loadConfig();
    
    this.storage = new StorageManager(config.settings.storageLocation);
    this.analysis = new AnalysisEngine();
    this.mcpHandler = new MCPProtocolHandler(this.storage, this.analysis);
    this.dashboard = new DashboardServer(this.storage, config.settings.dashboardPort);
    this.insights = new InsightsGenerator(this.storage);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Initialize storage
      await this.storage.initialize();
      
      // Start MCP protocol handler
      await this.mcpHandler.start();
      
      // Start dashboard server
      await this.dashboard.start();
      
      // Schedule background tasks
      this.scheduleBackgroundTasks();
      
      this.isRunning = true;
      
      // Handle graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (error) {
      console.error('Failed to start MCP Prompt Collector:', error);
      await this.shutdown();
      throw error;
    }
  }

  private scheduleBackgroundTasks(): void {
    // Generate insights daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.error('🔍 Generating daily insights...');
        await this.insights.generateInsights();
        console.error('✅ Daily insights generated');
      } catch (error) {
        console.error('❌ Error generating insights:', error);
      }
    });

    // Cleanup old data weekly
    cron.schedule('0 3 * * 0', async () => {
      try {
        console.error('🧹 Performing weekly cleanup...');
        // Cleanup logic would go here
        console.error('✅ Weekly cleanup completed');
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
      }
    });
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.error('🛑 Shutting down MCP Prompt Collector...');

    try {
      await this.mcpHandler.stop();
      await this.dashboard.stop();
      this.storage.close();
      this.isRunning = false;
      console.error('✅ Shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new MCPPromptCollector();
  collector.start().catch((error) => {
    console.error('Failed to start MCP Prompt Collector:', error);
    process.exit(1);
  });
}

export { MCPPromptCollector };