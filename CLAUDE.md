# CLAUDE.md - MCP Prompt Collector Specification

## Project Overview

### Application Name

> MCP Prompt Collector (or "Improver MCP")

### One-Line Description

> An MCP server that intercepts, stores, and analyzes all Claude Desktop prompts to provide actionable insights for improving prompt engineering skills.

### Target Audience

> Developers and power users of Claude Desktop who want to systematically improve their prompting skills through data-driven insights and historical analysis.

### Core Value Proposition

> Transforms every Claude interaction into a learning opportunity by providing detailed analytics, quality metrics, and personalized improvement suggestions based on your actual prompting patterns - all while maintaining your normal Claude Desktop workflow.

## Functional Requirements

### Primary Features (Must-Have)

1. **Transparent Prompt Interception** - Seamlessly captures all prompts sent through Claude Desktop without disrupting workflow
2. **Comprehensive Prompt Storage** - Stores full conversation history including prompts, responses, timestamps, and metadata in a local SQLite database
3. **Quality Analysis Engine** - Evaluates prompts for structure, clarity, specificity, bias, and effectiveness using configurable metrics
4. **Improvement Insights Dashboard** - Generates reports highlighting patterns, inefficiencies, and specific areas for improvement
5. **Progress Tracking** - Provides metrics and visualizations showing prompt quality trends over time

### Secondary Features (Nice-to-Have)

1. **Real-time Prompt Enhancement** - Optionally improves prompts before sending to Claude (with toggle)
2. **Prompt Templates Library** - Saves successful prompt patterns for reuse
3. **Context Awareness** - Tracks project/topic contexts to provide more relevant suggestions
4. **Export Capabilities** - Export prompt history and analytics in various formats (JSON, CSV, Markdown)
5. **Integration with Original Improver** - Ability to send complex prompts to your Electron app for detailed workshopping
6. **Scheduled Analysis Reports** - Daily/weekly email summaries of prompting patterns and improvements

### User Journey

1. User installs and configures the MCP server in Claude Desktop settings
2. They use Claude Desktop normally - the MCP server silently captures all interactions
3. Periodically (or on-demand), they access the analytics dashboard to review their prompt quality metrics
4. The system highlights specific patterns (e.g., "Your prompts lack context 40% of the time") with examples
5. User reviews personalized suggestions and applies improvements to future prompts
6. Over time, they can track their improvement through trend charts and statistics

## Technical Specifications

### Platform Requirements

> - [ ] Web Application (runs in browser)
> - [ ] Desktop Application (Windows)
> - [x] Desktop Application (macOS - unsigned/unnotarized is OK)
> - [ ] Desktop Application (Linux)
> - [x] Other: MCP Server (Node.js/TypeScript) with Web Dashboard

### Data Management

> - Data Storage: Local SQLite database for all prompt history and analytics
> - Data Format: Structured SQLite with JSON fields for flexible metadata
> - Data Privacy: All data stays local - no cloud sync, complete user control

### External Dependencies

> - APIs: None required (all analysis done locally)
> - Libraries:
>   - MCP SDK for Claude Desktop integration
>   - SQLite/better-sqlite3 for database
>   - Express.js for web dashboard
>   - Existing Improver analysis logic (adapted)
>   - Optional: Ollama for advanced local analysis
> - Network: Works completely offline after initial setup

## User Interface Design

### Visual Style

> - Style: Minimalist/Professional (matching Claude Desktop aesthetic)
> - Color Preference: Both light and dark themes to match system preference
> - Layout: Dashboard layout with multiple views (Overview, History, Analytics, Settings)

### Key UI Elements

> - Main Interface: Analytics dashboard showing prompt quality metrics, trends, and insights
> - Input Methods:
>   - Automatic capture from Claude Desktop
>   - Manual rating system for response quality
>   - Search/filter for prompt history
> - Output/Display:
>   - Charts (line graphs for trends, bar charts for categories)
>   - Tables (sortable prompt history)
>   - Cards (insight highlights and suggestions)
>   - Text (detailed analysis reports)

### Responsive Design

> - Desktop: Full features with multi-column layout
> - Tablet: Simplified single-column layout
> - Mobile: Read-only view for reviewing insights on the go

## Distribution Requirements

### Packaging Preferences

> - Web App: Local web server for dashboard (localhost:3456)
> - Desktop: Node.js package with npm installation
> - Installation: npm global install or local project setup

### Distribution Method

> - [x] GitHub releases
> - [x] npm package registry
> - [ ] Static hosting (Vercel, Netlify, GitHub Pages)
> - [ ] Share as single file
> - [ ] Other: [specify]

### Update Mechanism

> - Auto-update notification via npm
> - Manual update through npm update command
> - Backwards compatible with existing databases

## Constraints & Limitations

### Technical Constraints

> - Maximum file size: Database may grow large (implement rotation/archiving after 1GB)
> - Performance requirements: Must not add more than 50ms latency to Claude interactions
> - Browser support: Modern browsers only for dashboard (Chrome, Firefox, Safari, Edge)
> - No Apple Developer license for notarization: Understood ✓

### Development Constraints

> - Timeline: MVP within 2-3 weeks, focusing on core collection and analysis first
> - Maintenance: Clean, modular TypeScript code with comprehensive comments
> - Documentation needs:
>   - Installation guide
>   - Basic usage tutorial
>   - API documentation for extending analysis rules
>   - Example improvement patterns

## Example Use Cases

### Use Case 1

> **Scenario**: Developer frequently asks Claude for code refactoring help but gets inconsistent results
> **User Action**: Reviews their prompt history filtered by "refactoring" tag
> **Expected Result**: Dashboard shows that 60% of refactoring prompts lack "before" code examples and specific improvement goals. System suggests a template: "Refactor this [language] code from [current state] to achieve [specific goals]. Current code: `...` Constraints: [...]"

### Use Case 2

> **Scenario**: User wants to track improvement in their technical documentation prompts
> **User Action**: Views the "Technical Writing" category analytics over the past month
> **Expected Result**: Line graph shows increasing quality score from 6.2 to 8.5, with specific improvements in "context provision" (+40%) and "example inclusion" (+25%). Insights highlight that adding "target audience" specification correlates with better responses.

### Use Case 3

> **Scenario**: User notices Claude often asks for clarification
> **User Action**: Runs analysis on prompts that led to clarification requests
> **Expected Result**: System identifies pattern: 80% of clarification requests happen when prompts exceed 300 words without clear structure. Suggests using bullet points or numbered sections for complex prompts.

## Inspiration & References

### Similar Applications

> - **Cursor IDE**: Like how Cursor tracks coding patterns to improve suggestions, but for prompting
> - **Grammarly**: Real-time writing improvement, but focused on prompt engineering
> - **Google Analytics**: Comprehensive metrics dashboard UI pattern
> - **Your Original Improver App**: Reuse the analysis engine and technique recommendations

### Design References

> - Reference 1: Claude Desktop's clean interface - maintain visual consistency
> - Reference 2: Vercel Analytics Dashboard - clean metrics visualization
> - Reference 3: Linear's insight cards - for displaying improvement suggestions

## Success Criteria

### MVP Success Metrics

> - [x] Successfully captures 100% of prompts without any loss
> - [x] Provides at least 5 actionable insights within first week of usage
> - [x] Dashboard loads in under 2 seconds with 10,000+ stored prompts
> - [x] Quality scores correlate with user's subjective assessment (>70% accuracy)
> - [x] Zero impact on Claude Desktop performance

### User Feedback Plans

> - Testing approach: Personal dogfooding first, then 5-10 developer friends using Claude Desktop
> - Feedback channels:
>   - GitHub issues for bug reports
>   - Built-in feedback button in dashboard
>   - Discord community for feature discussions

## Additional Context

### Background

> This project extends your existing Improver app concept to work seamlessly with Claude Desktop. Instead of requiring users to manually workshop prompts, it provides continuous, passive improvement through analysis of actual usage patterns. The goal is to make prompt improvement as effortless as possible while providing deep insights for those who want them.

### Special Considerations

> - **Privacy First**: All data must remain local with clear data management options
> - **Non-Intrusive**: Must not interfere with natural Claude Desktop usage
> - **Extensible**: Architecture should allow for custom analysis rules and metrics
> - **Integration Ready**: Should be able to connect with your existing Improver Electron app for advanced workshopping
> - **MCP Compliance**: Must follow all MCP protocol specifications and best practices

### Questions for Claude

> 1. What's the best approach for implementing real-time prompt quality scoring without adding latency?
> 2. Should the initial version include the ability to modify prompts before sending, or focus purely on analysis?
> 3. What metrics would be most valuable for measuring prompt quality beyond the obvious (length, structure, clarity)?
> 4. How can we best handle storing and analyzing multi-turn conversations vs single prompts?
> 5. What's the optimal database schema for efficient querying of prompt patterns and trends?

---

## Implementation Priorities

1. **Phase 1 (Week 1)**: Core MCP server with prompt interception and storage
2. **Phase 2 (Week 2)**: Basic web dashboard with prompt history and search
3. **Phase 3 (Week 3)**: Quality analysis engine and metrics
4. **Phase 4 (Week 4)**: Insights generation and improvement suggestions
5. **Phase 5 (Future)**: Advanced features like real-time enhancement and template library
