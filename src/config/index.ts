import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { MCPConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ConfigManager {
  private configPath: string;
  private defaultConfig: MCPConfig;

  constructor() {
    // Get home directory with fallbacks for different environments
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
    const configDir = join(homeDir, '.mcp-prompt-collector', 'config');
    this.configPath = join(configDir, 'settings.json');
    
    this.defaultConfig = {
      name: 'mcp-prompt-collector',
      version: '1.0.0',
      protocol: 'mcp/1.0',
      capabilities: {
        intercept: true,
        modify: false,
        store: true,
      },
      settings: {
        enhancePrompts: false,
        storageLocation: join(homeDir, '.mcp-prompt-collector', 'data'),
        dashboardPort: 3456,
        analysisLevel: 'detailed',
        retentionDays: 90,
      },
    };
  }

  ensureConfigDirectory(): void {
    const configDir = join(this.configPath, '..');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
  }

  loadConfig(): MCPConfig {
    this.ensureConfigDirectory();
    
    if (!existsSync(this.configPath)) {
      this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    }

    try {
      const configContent = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configContent) as MCPConfig;
      
      // Merge with defaults to ensure all properties exist
      return {
        ...this.defaultConfig,
        ...config,
        capabilities: { ...this.defaultConfig.capabilities, ...config.capabilities },
        settings: { ...this.defaultConfig.settings, ...config.settings },
      };
    } catch (error) {
      console.warn('Error loading config, using defaults:', error);
      return this.defaultConfig;
    }
  }

  saveConfig(config: MCPConfig): void {
    this.ensureConfigDirectory();
    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  updateSettings(settings: Partial<MCPConfig['settings']>): void {
    const config = this.loadConfig();
    config.settings = { ...config.settings, ...settings };
    this.saveConfig(config);
  }

  getClaudeDesktopConfig(): any {
    const config = this.loadConfig();
    
    return {
      mcpServers: {
        [config.name]: {
          command: 'node',
          args: [join(process.cwd(), 'dist/index.js')],
          env: {
            MCP_CONFIG_PATH: this.configPath,
          },
        },
      },
    };
  }

  generateClaudeDesktopConfigPath(): string {
    // Default Claude Desktop config location on macOS
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
    const claudeConfigDir = join(
      homeDir,
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json'
    );
    
    return claudeConfigDir;
  }

  getConfigPath(): string {
    return this.configPath;
  }
}