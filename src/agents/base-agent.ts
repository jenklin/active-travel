/**
 * Base Agent class for all specialized travel agents
 * Provides common interface and utilities
 */

import { AgentDecision } from '../types/schema';

export interface AgentContext {
  tripId: string;
  userId: string;
  date: string;
  [key: string]: any;
}

export interface AgentRecommendation {
  decision: string;
  rationale: string;
  inputSignals: Record<string, any>;
  outputActions: string[];
  approvalRequired: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export abstract class BaseAgent {
  protected agentType: string;
  protected name: string;

  constructor(agentType: string, name: string) {
    this.agentType = agentType;
    this.name = name;
  }

  /**
   * Main decision-making method that each agent must implement
   */
  abstract analyze(context: AgentContext): Promise<AgentRecommendation>;

  /**
   * Validate that the agent has all required context to make decisions
   */
  protected validateContext(context: AgentContext, requiredFields: string[]): void {
    const missing = requiredFields.filter(field => !(field in context));
    if (missing.length > 0) {
      throw new Error(
        `${this.name} missing required context fields: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Create a structured recommendation
   */
  protected createRecommendation(
    decision: string,
    rationale: string,
    inputSignals: Record<string, any>,
    outputActions: string[],
    options: {
      approvalRequired?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): AgentRecommendation {
    return {
      decision,
      rationale,
      inputSignals,
      outputActions,
      approvalRequired: options.approvalRequired ?? false,
      priority: options.priority ?? 'medium',
    };
  }

  /**
   * Convert recommendation to decision record for storage
   */
  protected toDecision(
    recommendation: AgentRecommendation,
    tripId: string,
    date: string
  ): Omit<AgentDecision, 'id'> {
    return {
      tripId,
      date,
      agentType: this.agentType as any,
      decision: recommendation.decision,
      rationale: recommendation.rationale,
      inputSignals: recommendation.inputSignals,
      outputActions: recommendation.outputActions,
      timestamp: new Date().toISOString(),
      approvalRequired: recommendation.approvalRequired,
    };
  }

  /**
   * Log agent activity (can be enhanced with proper logging service)
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      agent: this.name,
      level,
      message,
      ...(data && { data }),
    };
    console.log(JSON.stringify(logEntry));
  }
}
