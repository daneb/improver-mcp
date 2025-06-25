#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ConfigManager } from './config/index.js';
import { MCPServer } from './server/index.js';

const program = new Command();

program
  .name('mcp-prompt-collector')
  .description('MCP server for collecting and analyzing Claude Desktop prompts')
  .version('1.0.0');

program
  .command('setup')
  .description('Setup MCP Prompt Collector with Claude Desktop')
  .option('--port <port>', 'Dashboard port', '3456')
  .option('--storage <path>', 'Storage location')
  .action(async (options) => {
    console.log('🚀 Setting up MCP Prompt Collector...\n');
    
    try {
      const configManager = new ConfigManager();
      const config = configManager.loadConfig();
      
      // Update settings if provided
      if (options.port) {
        config.settings.dashboardPort = parseInt(options.port);
      }
      
      if (options.storage) {
        config.settings.storageLocation = options.storage;
      }
      
      configManager.saveConfig(config);
      
      // Generate Claude Desktop config
      const claudeConfig = configManager.getClaudeDesktopConfig();
      const claudeConfigPath = configManager.generateClaudeDesktopConfigPath();
      
      console.log('✅ Configuration created successfully!');
      console.log(`📁 Config location: ${configManager.getConfigPath()}`);
      console.log(`💾 Data storage: ${config.settings.storageLocation}`);
      console.log(`🌐 Dashboard port: ${config.settings.dashboardPort}`);
      
      console.log('\n📋 Next steps:');
      console.log('1. Add the following to your Claude Desktop configuration:');
      console.log(`   File: ${claudeConfigPath}`);
      console.log('\n' + JSON.stringify(claudeConfig, null, 2));
      
      console.log('\n2. Restart Claude Desktop');
      console.log('3. Run the server: mcp-prompt-collector start');
      console.log(`4. View dashboard: http://localhost:${config.settings.dashboardPort}`);
      
      // Optionally try to update Claude config automatically
      if (existsSync(claudeConfigPath)) {
        try {
          const existingConfig = JSON.parse(readFileSync(claudeConfigPath, 'utf-8'));
          const updatedConfig = {
            ...existingConfig,
            mcpServers: {
              ...existingConfig.mcpServers,
              ...claudeConfig.mcpServers,
            },
          };
          
          writeFileSync(claudeConfigPath, JSON.stringify(updatedConfig, null, 2));
          console.log('\n✅ Automatically updated Claude Desktop configuration!');
          console.log('   Please restart Claude Desktop to activate the MCP server.');
        } catch (error) {
          console.log('\n⚠️  Could not automatically update Claude Desktop configuration.');
          console.log('   Please update it manually using the JSON above.');
        }
      }
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the MCP server')
  .option('--config <path>', 'Config file path')
  .action(async (options) => {
    try {
      console.log('🚀 Starting MCP Prompt Collector...\n');
      
      const configManager = new ConfigManager();
      const config = configManager.loadConfig();
      
      const server = new MCPServer({
        storageLocation: config.settings.storageLocation,
        dashboardPort: config.settings.dashboardPort,
      });
      
      await server.start();
      
      console.log('✅ MCP Prompt Collector is running!');
      console.log(`📊 Dashboard: http://localhost:${config.settings.dashboardPort}`);
      console.log('💾 Data storage:', config.settings.storageLocation);
      console.log('\n🔄 Waiting for Claude Desktop connections...');
      console.log('💡 Use Claude Desktop normally - all prompts will be captured automatically!');
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.loadConfig();
      
      console.log('📋 Current Configuration:');
      console.log(JSON.stringify(config, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check server status')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.loadConfig();
      
      // Try to connect to dashboard to check if server is running
      const response = await fetch(`http://localhost:${config.settings.dashboardPort}/api/health`);
      
      if (response.ok) {
        const data = await response.json() as { status: string; timestamp: string };
        console.log('✅ Server is running');
        console.log(`📊 Dashboard: http://localhost:${config.settings.dashboardPort}`);
        console.log('🕐 Status:', data.status);
        console.log('⏰ Timestamp:', data.timestamp);
      } else {
        console.log('❌ Server is not responding');
      }
      
    } catch (error) {
      console.log('❌ Server is not running');
      console.log('💡 Start with: mcp-prompt-collector start');
    }
  });

program
  .command('reset')
  .description('Reset configuration and data')
  .option('--config-only', 'Reset only configuration, keep data')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      
      if (options.configOnly) {
        configManager.saveConfig(configManager.loadConfig());
        console.log('✅ Configuration reset to defaults');
      } else {
        // This would need implementation to clear database
        console.log('⚠️  Full reset not implemented yet');
        console.log('💡 To reset data, delete the storage directory:');
        console.log('   ', configManager.loadConfig().settings.storageLocation);
      }
      
    } catch (error) {
      console.error('❌ Reset failed:', error);
      process.exit(1);
    }
  });

// Add package.json dependency for commander
if (process.argv.length < 3) {
  program.help();
}

program.parse();