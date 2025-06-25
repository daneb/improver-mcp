import { StorageManager } from '../storage/manager.js';
import { AnalysisEngine } from '../analysis/engine.js';
import { MCPProtocolHandler } from '../mcp/protocol.js';
import { DashboardServer } from '../dashboard/server.js';

export class MCPServer {
  private storage: StorageManager;
  private analysis: AnalysisEngine;
  private mcpHandler: MCPProtocolHandler;
  private dashboard: DashboardServer;
  private isRunning = false;

  constructor(options: {
    storageLocation?: string;
    dashboardPort?: number;
  } = {}) {
    this.storage = new StorageManager(options.storageLocation);
    this.analysis = new AnalysisEngine();
    this.mcpHandler = new MCPProtocolHandler(this.storage, this.analysis);
    this.dashboard = new DashboardServer(this.storage, options.dashboardPort);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('MCP Server is already running');
      return;
    }

    try {
      // Initialize storage
      await this.storage.initialize();
      console.log('Storage initialized');

      // Start MCP protocol handler
      await this.mcpHandler.start();
      console.log('MCP protocol handler started');

      // Start dashboard server
      await this.dashboard.start();
      console.log(`Dashboard server started on port ${this.dashboard.getPort()}`);

      this.isRunning = true;
      console.log('MCP Server started successfully');

      // Handle graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());

    } catch (error) {
      console.error('Failed to start MCP Server:', error);
      await this.shutdown();
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Shutting down MCP Server...');

    try {
      await this.mcpHandler.stop();
      await this.dashboard.stop();
      this.storage.close();
      this.isRunning = false;
      console.log('MCP Server shut down successfully');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }
}