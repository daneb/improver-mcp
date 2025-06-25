# MCP Prompt Collector

> An MCP server that provides interactive tools for logging, analyzing, and improving your Claude Desktop prompts to help you develop better prompt engineering skills.

## Installation

### Option 1: NPM Package (Recommended)

```bash
# Install globally
npm install -g mcp-prompt-collector

# Or install locally in your project
npm install mcp-prompt-collector
```

### Option 2: From Source

```bash
git clone https://github.com/daneb/improver-mcp.git
cd improver-mcp
npm install
npm run build
```

## Setup

1. **Configure Claude Desktop**
   
   Add this to your `~/Library/Application Support/Claude/claude_desktop_config.json`:
   
   **For global npm install:**
   ```json
   {
     "mcpServers": {
       "mcp-prompt-collector": {
         "command": "mcp-prompt-collector",
         "env": {
           "HOME": "/Users/daneb"
         }
       }
     }
   }
   ```
   
   **For source installation:**
   ```json
   {
     "mcpServers": {
       "mcp-prompt-collector": {
         "command": "/path/to/your/node",
         "args": ["/path/to/improver-mcp/dist/index.js"],
         "env": {
           "HOME": "/Users/daneb"
         }
       }
     }
   }
   ```

2. **Restart Claude Desktop** to load the MCP server

3. **Access the dashboard** at http://localhost:3456

## What It Does

- **🛠️ Interactive Tools**: Provides 4 tools accessible in Claude Desktop for prompt analysis
- **📊 Quality Analysis**: Scores prompts on structure, clarity, context, and effectiveness  
- **💡 Smart Insights**: Identifies patterns and suggests specific improvements
- **📈 Progress Tracking**: Shows quality trends and improvement over time
- **🌐 Web Dashboard**: Clean interface to view history, analytics, and insights

## Features

### Core Functionality
- ✅ Interactive MCP tools for Claude Desktop integration
- ✅ SQLite database for local storage (no cloud sync)
- ✅ Real-time prompt quality scoring
- ✅ Web dashboard with analytics
- ✅ Automated insights generation

### Available Tools
- **`log_prompt`** - Log and analyze a prompt with immediate quality feedback
- **`improve_prompt`** - Get specific suggestions for improving any prompt
- **`get_prompt_insights`** - View analytics and patterns from your prompt history
- **`view_stats`** - Display comprehensive statistics and quality trends

### Analysis Engine
- **Quality Scoring**: 0-10 score based on structure, clarity, and completeness
- **Complexity Detection**: Categorizes prompts as simple, moderate, or complex
- **Technique Suggestions**: Recommends optimal prompting techniques
- **Issue Detection**: Identifies ambiguity, missing context, bias, etc.

### Dashboard Features
- Prompt history with search and filtering
- Quality trends over time
- Complexity distribution charts
- Recent activity overview
- Actionable improvement insights

## Usage

### In Claude Desktop

Once the MCP server is running, you'll have access to these tools in Claude Desktop:

```
log_prompt
- Use: Log and analyze any prompt
- Example: "log_prompt" with your prompt text
- Returns: Quality score, complexity, and improvement suggestions

improve_prompt  
- Use: Get specific suggestions for a prompt
- Example: "improve_prompt" with your prompt and optional goal
- Returns: Detailed analysis and actionable improvement recommendations

get_prompt_insights
- Use: View patterns and insights from your prompt history
- Example: "get_prompt_insights" optionally filtered by category
- Returns: Analytics on your prompting patterns and common issues

view_stats
- Use: See comprehensive statistics and trends
- Example: "view_stats" for last 30 days (configurable)
- Returns: Total prompts, quality trends, complexity breakdown
```

### Development Commands

```bash
# Build and run
npm run build                       # Build TypeScript
npm run dev                         # Development mode with auto-reload
npm start                          # Start the MCP server

# Code quality
npm test                           # Run tests
npm run lint                       # Check code style
npm run format                     # Format code
```

## How It Works

1. **MCP Integration**: Registers as an MCP server with Claude Desktop
2. **Interactive Tools**: Provides 4 tools accessible through Claude Desktop interface
3. **Manual Logging**: Users explicitly log prompts using the `log_prompt` tool
4. **Analysis**: Scores quality, detects patterns, identifies improvements
5. **Storage**: Saves everything locally in SQLite database
6. **Insights**: Generates personalized suggestions based on your patterns
7. **Dashboard**: Provides web interface to view analytics and history

## Configuration

Default configuration is stored in `~/.mcp-prompt-collector/config/settings.json`:

```json
{
  "name": "mcp-prompt-collector",
  "capabilities": {
    "intercept": true,
    "modify": false,
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

## Data Storage

All data is stored locally in SQLite database:
- **Location**: `~/.mcp-prompt-collector/data/prompt_history.db`
- **Privacy**: No cloud sync, complete local control
- **Retention**: Configurable cleanup after N days
- **Export**: Full data export capabilities

## Development

```bash
# Clone and setup
git clone <repo-url>
cd mcp-prompt-collector
npm install

# Development workflow
npm run dev        # Watch mode
npm run build      # Production build
npm test          # Run tests
npm run lint      # Code quality

# Testing
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
```

## Architecture

- **MCP Protocol Handler**: Communicates with Claude Desktop
- **Storage Manager**: SQLite database operations
- **Analysis Engine**: Prompt quality scoring and insights
- **Dashboard Server**: Express.js web interface
- **Background Worker**: Scheduled analysis and cleanup

## Privacy & Security

- ✅ **Local Only**: All data stays on your machine
- ✅ **No Cloud Sync**: Zero external data transmission
- ✅ **User Control**: Complete data ownership and export
- ✅ **Transparent**: Open source, auditable code

## Requirements

- **Node.js**: 18+ 
- **Claude Desktop**: Latest version with MCP support
- **macOS**: Primary support (Windows/Linux coming soon)

## Troubleshooting

**Server won't start**
- Check if port 3456 is available
- Verify Claude Desktop MCP configuration
- Run `mcp-prompt-collector status` for diagnostics

**No prompts showing in dashboard**
- Make sure you're using the `log_prompt` tool in Claude Desktop
- Prompts are not automatically captured - you must manually log them
- Check that the MCP server tools are available in Claude Desktop

**Dashboard not loading**
- Check if server is running on correct port
- Try different port with `setup --port 3457`
- Check browser console for errors

## License

MIT License - see LICENSE file for details