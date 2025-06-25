import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PromptData, ResponseData, ConversationData, InsightData, MetricData } from '../types/index.js';

export class StorageManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(storageLocation?: string) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
    const defaultPath = join(homeDir, '.mcp-prompt-collector', 'data');
    const dataDir = storageLocation || defaultPath;
    
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    this.dbPath = join(dataDir, 'prompt_history.db');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async initialize(): Promise<void> {
    this.createTables();
    this.createIndexes();
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prompts (
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

      CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        prompt_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        tokens_used INTEGER,
        user_rating INTEGER CHECK(user_rating BETWEEN 1 AND 5),
        FOREIGN KEY (prompt_id) REFERENCES prompts(id)
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        title TEXT,
        summary TEXT,
        total_prompts INTEGER DEFAULT 0,
        average_quality REAL
      );

      CREATE TABLE IF NOT EXISTS insights (
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

      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metadata JSON,
        UNIQUE(date, metric_name)
      );
    `);
  }

  private createIndexes(): void {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_prompts_timestamp ON prompts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_prompts_conversation ON prompts(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_prompts_quality ON prompts(quality_score);
      CREATE INDEX IF NOT EXISTS idx_responses_prompt ON responses(prompt_id);
      CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(type);
      CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date);
    `);
  }

  async savePrompt(prompt: Omit<PromptData, 'id' | 'timestamp'>): Promise<string> {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO prompts (id, content, context, conversation_id, quality_score, complexity, technique_used, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      prompt.content,
      prompt.context || null,
      prompt.conversationId || null,
      prompt.qualityScore || null,
      prompt.complexity || null,
      prompt.techniqueUsed || null,
      prompt.metadata ? JSON.stringify(prompt.metadata) : null
    );

    return id;
  }

  async saveResponse(response: Omit<ResponseData, 'id' | 'timestamp'>): Promise<string> {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO responses (id, prompt_id, content, tokens_used, user_rating)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      response.promptId,
      response.content,
      response.tokensUsed || null,
      response.userRating || null
    );

    return id;
  }

  async updatePromptAnalysis(promptId: string, qualityScore: number, complexity: string, techniqueUsed: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE prompts 
      SET quality_score = ?, complexity = ?, technique_used = ?
      WHERE id = ?
    `);
    
    stmt.run(qualityScore, complexity, techniqueUsed, promptId);
  }

  async getPrompts(limit = 50, offset = 0): Promise<PromptData[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM prompts 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(limit, offset) as any[];
    return rows.map(this.mapPromptRow);
  }

  async getPromptById(id: string): Promise<PromptData | null> {
    const stmt = this.db.prepare('SELECT * FROM prompts WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapPromptRow(row) : null;
  }

  async getResponsesByPromptId(promptId: string): Promise<ResponseData[]> {
    const stmt = this.db.prepare('SELECT * FROM responses WHERE prompt_id = ? ORDER BY timestamp');
    const rows = stmt.all(promptId) as any[];
    return rows.map(this.mapResponseRow);
  }

  async getQualityMetrics(days = 30): Promise<Array<{ date: string; averageQuality: number; count: number }>> {
    const stmt = this.db.prepare(`
      SELECT 
        DATE(timestamp) as date,
        AVG(quality_score) as averageQuality,
        COUNT(*) as count
      FROM prompts 
      WHERE quality_score IS NOT NULL 
        AND timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);
    
    return stmt.all(days) as any[];
  }

  async saveInsight(insight: Omit<InsightData, 'id' | 'createdAt'>): Promise<string> {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO insights (id, type, severity, title, description, evidence, prompt_ids, acknowledged)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      insight.type,
      insight.severity,
      insight.title,
      insight.description || null,
      insight.evidence ? JSON.stringify(insight.evidence) : null,
      insight.promptIds ? JSON.stringify(insight.promptIds) : null,
      insight.acknowledged
    );

    return id;
  }

  async getUnacknowledgedInsights(): Promise<InsightData[]> {
    const stmt = this.db.prepare('SELECT * FROM insights WHERE acknowledged = FALSE ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(this.mapInsightRow);
  }

  private mapPromptRow(row: any): PromptData {
    return {
      id: row.id,
      content: row.content,
      timestamp: new Date(row.timestamp),
      context: row.context,
      conversationId: row.conversation_id,
      qualityScore: row.quality_score,
      complexity: row.complexity,
      techniqueUsed: row.technique_used,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  private mapResponseRow(row: any): ResponseData {
    return {
      id: row.id,
      promptId: row.prompt_id,
      content: row.content,
      timestamp: new Date(row.timestamp),
      tokensUsed: row.tokens_used,
      userRating: row.user_rating,
    };
  }

  private mapInsightRow(row: any): InsightData {
    return {
      id: row.id,
      createdAt: new Date(row.created_at),
      type: row.type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      evidence: row.evidence ? JSON.parse(row.evidence) : undefined,
      promptIds: row.prompt_ids ? JSON.parse(row.prompt_ids) : undefined,
      acknowledged: Boolean(row.acknowledged),
    };
  }

  close(): void {
    this.db.close();
  }
}