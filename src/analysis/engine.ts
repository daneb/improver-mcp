import { PromptAnalysis } from '../types/index.js';

export class AnalysisEngine {
  private techniques = {
    simple: ['Zero-Shot', 'Direct Question'],
    moderate: ['Few-Shot', 'Chain of Thought', 'Role-Based'],
    complex: ['Tree of Thoughts', 'ReAct', 'Multi-Step Reasoning'],
  };

  async analyzePrompt(prompt: string): Promise<PromptAnalysis> {
    const structure = this.analyzeStructure(prompt);
    const issues = this.detectIssues(prompt, structure);
    const complexity = this.determineComplexity(prompt, structure);
    const suggestedTechnique = this.selectTechnique(complexity, structure);
    const qualityScore = this.calculateQualityScore(structure, issues);

    return {
      qualityScore,
      complexity,
      structure,
      issues,
      suggestedTechnique,
      techniqueRationale: this.getTechniqueRationale(suggestedTechnique, complexity),
    };
  }

  private analyzeStructure(prompt: string) {
    const words = prompt.split(/\s+/);
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      hasContext: this.detectContext(prompt),
      hasExamples: this.detectExamples(prompt),
      hasConstraints: this.detectConstraints(prompt),
      hasExpectedOutput: this.detectExpectedOutput(prompt),
      clarityScore: this.calculateClarityScore(prompt, words, sentences),
    };
  }

  private detectContext(prompt: string): boolean {
    const contextIndicators = [
      'context', 'background', 'situation', 'scenario', 'given that',
      'assuming', 'consider', 'in the context of', 'for this project',
      'working on', 'building', 'creating'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return contextIndicators.some(indicator => lowerPrompt.includes(indicator));
  }

  private detectExamples(prompt: string): boolean {
    const exampleIndicators = [
      'example', 'for instance', 'such as', 'like this', 'here\'s an example',
      'e.g.', 'for example', 'including', 'sample', 'demo'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return exampleIndicators.some(indicator => lowerPrompt.includes(indicator));
  }

  private detectConstraints(prompt: string): boolean {
    const constraintIndicators = [
      'must', 'should', 'cannot', 'don\'t', 'avoid', 'only', 'exactly',
      'within', 'limit', 'constraint', 'requirement', 'ensure', 'make sure'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return constraintIndicators.some(indicator => lowerPrompt.includes(indicator));
  }

  private detectExpectedOutput(prompt: string): boolean {
    const outputIndicators = [
      'output', 'result', 'response', 'format', 'structure', 'return',
      'provide', 'give me', 'i want', 'i need', 'show me', 'list',
      'explain', 'describe', 'write', 'create', 'generate'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return outputIndicators.some(indicator => lowerPrompt.includes(indicator));
  }

  private calculateClarityScore(prompt: string, words: string[], sentences: string[]): number {
    let score = 10;
    
    // Penalize very short or very long prompts
    if (words.length < 10) score -= 2;
    if (words.length > 500) score -= 1;
    
    // Penalize very long sentences (potential run-on sentences)
    const avgWordsPerSentence = words.length / sentences.length;
    if (avgWordsPerSentence > 30) score -= 1;
    
    // Reward clear structure indicators
    if (prompt.includes('\n') || prompt.includes('1.') || prompt.includes('-')) score += 1;
    
    // Penalize excessive punctuation or caps
    const excessivePunctuation = (prompt.match(/[!?]{2,}/g) || []).length;
    const excessiveCaps = (prompt.match(/[A-Z]{5,}/g) || []).length;
    score -= (excessivePunctuation + excessiveCaps) * 0.5;
    
    return Math.max(0, Math.min(10, score));
  }

  private detectIssues(prompt: string, structure: any): PromptAnalysis['issues'] {
    const issues: PromptAnalysis['issues'] = [];
    
    if (!structure.hasContext && prompt.length > 100) {
      issues.push({
        type: 'missing_context',
        description: 'Prompt lacks sufficient context for complex request',
        severity: 'medium',
      });
    }
    
    if (prompt.length < 20) {
      issues.push({
        type: 'too_broad',
        description: 'Prompt is very short and may be too broad',
        severity: 'high',
      });
    }
    
    if (this.detectAmbiguity(prompt)) {
      issues.push({
        type: 'ambiguity',
        description: 'Prompt contains ambiguous language that may lead to unclear responses',
        severity: 'medium',
      });
    }
    
    if (this.detectPotentialBias(prompt)) {
      issues.push({
        type: 'bias',
        description: 'Prompt may contain biased language or assumptions',
        severity: 'low',
      });
    }
    
    return issues;
  }

  private detectAmbiguity(prompt: string): boolean {
    const ambiguousWords = [
      'something', 'anything', 'stuff', 'things', 'some', 'any',
      'maybe', 'perhaps', 'might', 'could be', 'sort of', 'kind of'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return ambiguousWords.some(word => lowerPrompt.includes(word));
  }

  private detectPotentialBias(prompt: string): boolean {
    // Simple bias detection - would be more sophisticated in production
    const biasIndicators = [
      'obviously', 'clearly', 'everyone knows', 'it\'s common sense',
      'normal people', 'typical', 'standard'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return biasIndicators.some(indicator => lowerPrompt.includes(indicator));
  }

  private determineComplexity(prompt: string, structure: any): 'simple' | 'moderate' | 'complex' {
    let complexityScore = 0;
    
    // Word count contribution
    const words = prompt.split(/\s+/).length;
    if (words > 100) complexityScore += 1;
    if (words > 200) complexityScore += 1;
    
    // Structure contribution
    if (structure.hasContext) complexityScore += 1;
    if (structure.hasExamples) complexityScore += 1;
    if (structure.hasConstraints) complexityScore += 1;
    
    // Multiple requests or steps
    if (prompt.includes(' and ') || prompt.includes(', ') || prompt.includes('\n')) {
      complexityScore += 1;
    }
    
    // Technical content
    if (this.detectTechnicalContent(prompt)) complexityScore += 1;
    
    if (complexityScore <= 2) return 'simple';
    if (complexityScore <= 4) return 'moderate';
    return 'complex';
  }

  private detectTechnicalContent(prompt: string): boolean {
    const technicalIndicators = [
      'code', 'function', 'algorithm', 'api', 'database', 'sql',
      'programming', 'development', 'technical', 'implementation',
      'architecture', 'design pattern', 'framework', 'library'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return technicalIndicators.some(indicator => lowerPrompt.includes(indicator));
  }

  private selectTechnique(complexity: 'simple' | 'moderate' | 'complex', structure: any): string {
    const availableTechniques = this.techniques[complexity];
    
    // Simple heuristics for technique selection
    if (complexity === 'simple') {
      return structure.hasExpectedOutput ? 'Direct Question' : 'Zero-Shot';
    }
    
    if (complexity === 'moderate') {
      if (structure.hasExamples) return 'Few-Shot';
      if (structure.hasContext) return 'Role-Based';
      return 'Chain of Thought';
    }
    
    // Complex
    if (structure.hasConstraints && structure.hasContext) return 'ReAct';
    if (this.detectMultiStep(structure)) return 'Multi-Step Reasoning';
    return 'Tree of Thoughts';
  }

  private detectMultiStep(structure: any): boolean {
    // Simplified multi-step detection
    return structure.hasConstraints && structure.hasExpectedOutput;
  }

  private getTechniqueRationale(technique: string, complexity: string): string {
    const rationales: Record<string, string> = {
      'Zero-Shot': 'Simple, direct prompt suitable for straightforward requests',
      'Direct Question': 'Clear question format with expected output specified',
      'Few-Shot': 'Examples provided to guide the model\'s response format',
      'Chain of Thought': 'Moderate complexity requiring step-by-step reasoning',
      'Role-Based': 'Context suggests specific expertise or perspective needed',
      'Tree of Thoughts': 'Complex problem requiring exploration of multiple approaches',
      'ReAct': 'Complex task with constraints requiring reasoning and action',
      'Multi-Step Reasoning': 'Complex multi-part problem requiring structured approach',
    };
    
    return rationales[technique] || 'Selected based on prompt complexity and structure';
  }

  private calculateQualityScore(structure: any, issues: PromptAnalysis['issues']): number {
    let score = 10;
    
    // Deduct for missing structural elements
    if (!structure.hasContext) score -= 1.5;
    if (!structure.hasExamples) score -= 0.5;
    if (!structure.hasConstraints) score -= 0.5;
    if (!structure.hasExpectedOutput) score -= 1;
    
    // Deduct for issues
    issues.forEach((issue) => {
      switch (issue.severity) {
        case 'high': score -= 2; break;
        case 'medium': score -= 1; break;
        case 'low': score -= 0.5; break;
      }
    });
    
    // Add clarity bonus
    score += (structure.clarityScore / 10) * 2;
    
    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  }
}