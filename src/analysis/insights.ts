import { StorageManager } from '../storage/manager.js';
import { PromptData, InsightData } from '../types/index.js';

export class InsightsGenerator {
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  async generateInsights(): Promise<InsightData[]> {
    const recentPrompts = await this.storage.getPrompts(500, 0); // Analyze last 500 prompts
    const insights: Omit<InsightData, 'id' | 'createdAt'>[] = [];

    // Analyze patterns and generate insights
    insights.push(...this.analyzeQualityTrends(recentPrompts));
    insights.push(...this.analyzeComplexityPatterns(recentPrompts));
    insights.push(...this.analyzeContextUsage(recentPrompts));
    insights.push(...this.analyzePromptLength(recentPrompts));
    insights.push(...this.analyzeFrequencyPatterns(recentPrompts));

    // Save insights to database
    const savedInsights: InsightData[] = [];
    for (const insight of insights) {
      const id = await this.storage.saveInsight(insight);
      savedInsights.push({
        id,
        createdAt: new Date(),
        ...insight,
      });
    }

    return savedInsights;
  }

  private analyzeQualityTrends(prompts: PromptData[]): Omit<InsightData, 'id' | 'createdAt'>[] {
    const insights: Omit<InsightData, 'id' | 'createdAt'>[] = [];
    const qualityPrompts = prompts.filter(p => p.qualityScore !== undefined);
    
    if (qualityPrompts.length < 10) return insights;

    const recentScore = this.calculateAverageQuality(qualityPrompts.slice(0, 50));
    const olderScore = this.calculateAverageQuality(qualityPrompts.slice(50, 100));

    if (recentScore < olderScore - 0.5) {
      insights.push({
        type: 'quality_decline',
        severity: 'warning',
        title: 'Prompt Quality Declining',
        description: `Your recent prompts have an average quality score of ${recentScore.toFixed(1)}, down from ${olderScore.toFixed(1)}. Consider adding more context and examples to your prompts.`,
        evidence: { recentScore, olderScore, sampleSize: qualityPrompts.length },
        promptIds: qualityPrompts.slice(0, 10).map(p => p.id),
        acknowledged: false,
      });
    } else if (recentScore > olderScore + 0.5) {
      insights.push({
        type: 'quality_improvement',
        severity: 'info',
        title: 'Prompt Quality Improving',
        description: `Great job! Your recent prompts have an average quality score of ${recentScore.toFixed(1)}, up from ${olderScore.toFixed(1)}.`,
        evidence: { recentScore, olderScore, sampleSize: qualityPrompts.length },
        acknowledged: false,
      });
    }

    return insights;
  }

  private analyzeComplexityPatterns(prompts: PromptData[]): Omit<InsightData, 'id' | 'createdAt'>[] {
    const insights: Omit<InsightData, 'id' | 'createdAt'>[] = [];
    const complexityPrompts = prompts.filter(p => p.complexity !== undefined);
    
    if (complexityPrompts.length < 20) return insights;

    const complexityDistribution = complexityPrompts.reduce((acc, prompt) => {
      acc[prompt.complexity!] = (acc[prompt.complexity!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = complexityPrompts.length;
    const simplePercent = (complexityDistribution.simple || 0) / total * 100;
    const complexPercent = (complexityDistribution.complex || 0) / total * 100;

    if (simplePercent > 80) {
      insights.push({
        type: 'complexity_suggestion',
        severity: 'suggestion',
        title: 'Consider More Detailed Prompts',
        description: `${simplePercent.toFixed(0)}% of your prompts are classified as simple. Adding more context, examples, or constraints could improve response quality.`,
        evidence: { complexityDistribution, simplePercent },
        acknowledged: false,
      });
    }

    if (complexPercent > 60) {
      insights.push({
        type: 'complexity_warning',
        severity: 'suggestion',
        title: 'Many Complex Prompts Detected',
        description: `${complexPercent.toFixed(0)}% of your prompts are complex. Consider breaking down complex requests into smaller, more focused prompts for better results.`,
        evidence: { complexityDistribution, complexPercent },
        acknowledged: false,
      });
    }

    return insights;
  }

  private analyzeContextUsage(prompts: PromptData[]): Omit<InsightData, 'id' | 'createdAt'>[] {
    const insights: Omit<InsightData, 'id' | 'createdAt'>[] = [];
    
    if (prompts.length < 20) return insights;

    const promptsWithContext = prompts.filter(p => this.hasContextIndicators(p.content));
    const contextUsagePercent = (promptsWithContext.length / prompts.length) * 100;

    if (contextUsagePercent < 30) {
      const lowContextPrompts = prompts
        .filter(p => !this.hasContextIndicators(p.content) && p.content.length > 50)
        .slice(0, 5);

      insights.push({
        type: 'context_suggestion',
        severity: 'suggestion',
        title: 'Add More Context to Your Prompts',
        description: `Only ${contextUsagePercent.toFixed(0)}% of your prompts include context. Adding background information can significantly improve response quality.`,
        evidence: { contextUsagePercent, totalPrompts: prompts.length },
        promptIds: lowContextPrompts.map(p => p.id),
        acknowledged: false,
      });
    }

    return insights;
  }

  private analyzePromptLength(prompts: PromptData[]): Omit<InsightData, 'id' | 'createdAt'>[] {
    const insights: Omit<InsightData, 'id' | 'createdAt'>[] = [];
    
    if (prompts.length < 20) return insights;

    const lengths = prompts.map(p => p.content.length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const shortPrompts = prompts.filter(p => p.content.length < 20);
    const veryLongPrompts = prompts.filter(p => p.content.length > 1000);

    if (shortPrompts.length / prompts.length > 0.3) {
      insights.push({
        type: 'length_warning',
        severity: 'suggestion',
        title: 'Many Short Prompts Detected',
        description: `${((shortPrompts.length / prompts.length) * 100).toFixed(0)}% of your prompts are very short (< 20 characters). Short prompts often lead to generic responses.`,
        evidence: { shortPromptsCount: shortPrompts.length, totalPrompts: prompts.length, avgLength },
        promptIds: shortPrompts.slice(0, 5).map(p => p.id),
        acknowledged: false,
      });
    }

    if (veryLongPrompts.length / prompts.length > 0.2) {
      insights.push({
        type: 'length_suggestion',
        severity: 'info',
        title: 'Consider Breaking Down Long Prompts',
        description: `${((veryLongPrompts.length / prompts.length) * 100).toFixed(0)}% of your prompts are very long (> 1000 characters). Consider breaking them into smaller, focused requests.`,
        evidence: { longPromptsCount: veryLongPrompts.length, totalPrompts: prompts.length, avgLength },
        acknowledged: false,
      });
    }

    return insights;
  }

  private analyzeFrequencyPatterns(prompts: PromptData[]): Omit<InsightData, 'id' | 'createdAt'>[] {
    const insights: Omit<InsightData, 'id' | 'createdAt'>[] = [];
    
    if (prompts.length < 50) return insights;

    // Analyze daily patterns
    const dailyCount = this.groupPromptsByDay(prompts);
    const avgDailyPrompts = Object.values(dailyCount).reduce((sum, count) => sum + count, 0) / Object.keys(dailyCount).length;

    if (avgDailyPrompts > 50) {
      insights.push({
        type: 'usage_pattern',
        severity: 'info',
        title: 'High Daily Usage Detected',
        description: `You're averaging ${avgDailyPrompts.toFixed(0)} prompts per day. Consider creating templates for common requests to save time.`,
        evidence: { avgDailyPrompts, totalDays: Object.keys(dailyCount).length },
        acknowledged: false,
      });
    }

    // Analyze common patterns in prompt content
    const commonWords = this.findCommonWords(prompts);
    if (commonWords.length > 0) {
      insights.push({
        type: 'pattern_detection',
        severity: 'info',
        title: 'Common Prompt Patterns Found',
        description: `You frequently use these terms: ${commonWords.slice(0, 5).join(', ')}. Consider creating templates for these common requests.`,
        evidence: { commonWords: commonWords.slice(0, 10) },
        acknowledged: false,
      });
    }

    return insights;
  }

  private calculateAverageQuality(prompts: PromptData[]): number {
    const qualityScores = prompts
      .filter(p => p.qualityScore !== undefined)
      .map(p => p.qualityScore!);
    
    if (qualityScores.length === 0) return 0;
    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  }

  private hasContextIndicators(content: string): boolean {
    const contextIndicators = [
      'context', 'background', 'situation', 'scenario', 'given that',
      'assuming', 'consider', 'in the context of', 'for this project',
      'working on', 'building', 'creating', 'i am', 'i have', 'my project'
    ];
    
    const lowerContent = content.toLowerCase();
    return contextIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private groupPromptsByDay(prompts: PromptData[]): Record<string, number> {
    return prompts.reduce((acc, prompt) => {
      const day = prompt.timestamp.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private findCommonWords(prompts: PromptData[]): string[] {
    const wordFreq: Record<string, number> = {};
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'must', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'];

    prompts.forEach(prompt => {
      const words = prompt.content
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.includes(word));

      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
    });

    return Object.entries(wordFreq)
      .filter(([_, count]) => count >= 3)
      .sort(([_, a], [__, b]) => b - a)
      .map(([word, _]) => word);
  }
}