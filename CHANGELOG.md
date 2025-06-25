# Changelog

All notable changes to the MCP Prompt Collector project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-25

### 🎉 Initial Release - MVP Launch

#### Added
- **Core MCP Server Implementation**
  - Full Model Context Protocol (MCP) compliance for Claude Desktop integration
  - StdioServerTransport for JSON-RPC communication
  - Proper environment variable handling for MCP context
  - Graceful startup/shutdown with signal handling

- **Interactive Tool Suite**
  - `log_prompt` - Log and analyze prompts with quality scoring
  - `improve_prompt` - Get specific suggestions for prompt improvement
  - `get_prompt_insights` - View analytics and patterns from prompt history
  - `view_stats` - Display comprehensive statistics and trends
  - Real-time analysis with immediate feedback

- **Advanced Analysis Engine**
  - Quality scoring algorithm (0-10 scale) based on structure, clarity, and completeness
  - Complexity detection (simple/moderate/complex) with detailed rationale
  - Issue detection for ambiguity, missing context, bias, and more
  - Technique recommendations (Chain-of-Thought, Few-Shot, etc.)
  - Structure analysis for context, examples, constraints, and expected output

- **Local SQLite Database**
  - Comprehensive schema for prompts, responses, analyses, and insights
  - Full conversation context tracking with metadata support
  - Quality metrics aggregation and trend analysis
  - Automatic database initialization and migration support
  - Privacy-first design - all data stays local

- **Web Dashboard**
  - Clean, responsive interface with light/dark theme support
  - Real-time statistics: total prompts, average quality, today's prompts
  - Recent prompt history with quality scores and complexity indicators
  - RESTful API endpoints for all data access
  - WebSocket support for real-time updates (foundation for future features)

- **Configuration Management**
  - Flexible configuration system with JSON settings
  - User-configurable storage location and dashboard port
  - Environment-aware defaults with override capabilities
  - Automatic configuration directory creation

- **Background Processing**
  - Scheduled daily insights generation (2 AM)
  - Weekly data cleanup routines (configurable retention)
  - Cron-based task scheduling with error handling

#### Technical Architecture
- **TypeScript/Node.js** - Full ES modules with modern async/await patterns
- **Express.js** - RESTful API server with CORS support
- **better-sqlite3** - High-performance local database with synchronous operations
- **MCP SDK** - Official Model Context Protocol implementation
- **Built-in Testing** - Jest configuration with comprehensive test structure
- **Code Quality** - ESLint, Prettier, and TypeScript strict mode
- **Build System** - TypeScript compilation with source maps

#### Developer Experience
- Complete build toolchain with `npm run build`
- Development mode with watch compilation
- Comprehensive error handling and logging
- Modular architecture for easy extension
- Full TypeScript interfaces and type safety

#### Privacy & Security
- **100% Local Operation** - No cloud services or external data transmission
- **User Data Control** - Complete ownership of all prompt history and analytics
- **Transparent Processing** - Open source with auditable analysis algorithms
- **Secure Storage** - Local SQLite with no network exposure
- **Configurable Retention** - User-controlled data lifecycle management

### Fixed
- **MCP Protocol Compliance**
  - Resolved ES module vs CommonJS compatibility issues
  - Fixed JSON-RPC communication with proper stdout/stderr separation
  - Corrected request handler setup for resources/list and prompts/list endpoints
  - Addressed Node.js version compatibility between Claude Desktop and server

- **Dashboard Statistics**
  - Fixed "Today's Prompts" calculation and display
  - Corrected stats API response to include all required metrics
  - Ensured proper date handling for daily prompt counting

- **Environment Integration**
  - Resolved HOME environment variable issues in MCP context
  - Fixed module resolution paths for ES imports
  - Corrected file system permissions for configuration directories

### Known Limitations
- **Manual Prompt Logging** - MCP protocol doesn't support automatic interception; users must explicitly use tools
- **macOS Primary Support** - While Node.js code is cross-platform, installation focuses on macOS first
- **No Real-time Modification** - Current version focuses on analysis rather than prompt enhancement

### Migration Notes
This is the initial release, so no migration is needed. Future versions will include migration scripts for database schema updates.

---

## Development Notes

### Version 1.0.0 Development Timeline
- **Week 1**: Core MCP server implementation and database design
- **Week 2**: Analysis engine development and quality scoring algorithms
- **Week 3**: Web dashboard creation and API development
- **Week 4**: Integration testing, bug fixes, and documentation

### Architectural Decisions
- **Tool-based Approach**: Chose interactive tools over automatic interception due to MCP protocol limitations
- **Local-first Design**: Prioritized user privacy and data control over cloud-based features
- **Modular Structure**: Designed for easy extension and community contributions
- **TypeScript**: Selected for type safety and maintainability in a complex system

### Testing Strategy
- Extensive dogfooding with real Claude Desktop usage
- Integration testing with various prompt types and complexities
- Performance testing with large prompt datasets
- Cross-platform compatibility verification