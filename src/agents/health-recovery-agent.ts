/**
 * Health & Recovery Agent
 *
 * Responsibility: Protect traveler's physical well-being, sleep quality,
 * and long-term enjoyment of the trip.
 *
 * Based on Section 11C from asia_golf_culture_itinerary.md
 */

import { BaseAgent, AgentContext, AgentRecommendation } from './base-agent';
import { WellnessProfile } from '../types/schema';

interface HealthRecoveryContext extends AgentContext {
  sleepQuality?: number; // 1-5
  energyRating?: number; // 1-5
  consecutiveActiveDays: number;
  environmentalStress?: {
    heat?: boolean;
    humidity?: boolean;
    travel?: boolean;
  };
  wellnessProfile?: WellnessProfile;
  plannedActivity?: {
    type: string;
    physicalLoad: 'low' | 'medium' | 'high';
    estimatedSteps?: number;
  };
}

export class HealthRecoveryAgent extends BaseAgent {
  constructor() {
    super('health_recovery', 'Health & Recovery Agent');
  }

  async analyze(context: HealthRecoveryContext): Promise<AgentRecommendation> {
    this.validateContext(context, ['tripId', 'userId', 'date', 'consecutiveActiveDays']);

    const signals = this.collectSignals(context);
    const riskLevel = this.assessRiskLevel(signals);

    this.log('info', 'Analyzing health & recovery needs', { signals, riskLevel });

    // Decision rules from itinerary spec
    if (this.requiresFullRestDay(signals)) {
      return this.recommendFullRestDay(signals);
    }

    if (this.requiresActivityModeration(signals, context)) {
      return this.recommendActivityModeration(signals, context);
    }

    if (this.shouldInsertWellnessActivity(signals)) {
      return this.recommendWellnessActivity(signals);
    }

    // No intervention needed
    return this.createRecommendation(
      'Proceed with planned activities',
      'Health indicators are within acceptable ranges. No intervention required.',
      signals,
      [],
      { priority: 'low' }
    );
  }

  private collectSignals(context: HealthRecoveryContext): Record<string, any> {
    return {
      sleepQuality: context.sleepQuality,
      energyRating: context.energyRating,
      consecutiveActiveDays: context.consecutiveActiveDays,
      environmentalStress: context.environmentalStress,
      mobilityLevel: context.wellnessProfile?.mobilityLevel,
      stepsTarget: context.wellnessProfile?.stepsTarget || 8000,
      plannedSteps: context.plannedActivity?.estimatedSteps,
      physicalLoad: context.plannedActivity?.physicalLoad,
    };
  }

  private assessRiskLevel(signals: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Poor sleep quality
    if (signals.sleepQuality && signals.sleepQuality < 3) {
      riskScore += 2;
    }

    // Low energy
    if (signals.energyRating && signals.energyRating < 3) {
      riskScore += 2;
    }

    // Too many consecutive active days
    if (signals.consecutiveActiveDays >= 3) {
      riskScore += 1;
    }
    if (signals.consecutiveActiveDays >= 5) {
      riskScore += 2;
    }

    // Environmental stress
    if (signals.environmentalStress) {
      const stressors = Object.values(signals.environmentalStress).filter(Boolean).length;
      riskScore += stressors;
    }

    // Physical load too high
    if (signals.physicalLoad === 'high') {
      riskScore += 1;
    }

    // Steps exceeding target
    if (signals.plannedSteps && signals.stepsTarget && signals.plannedSteps > signals.stepsTarget) {
      riskScore += 1;
    }

    if (riskScore >= 6) return 'critical';
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Rule: If sleep quality < 3/5 for two consecutive nights, recommend full rest day
   */
  private requiresFullRestDay(signals: Record<string, any>): boolean {
    // TODO: Would need to track consecutive poor sleep - for now use single day threshold
    return (
      (signals.sleepQuality && signals.sleepQuality < 3) ||
      (signals.energyRating && signals.energyRating < 2) ||
      signals.consecutiveActiveDays >= 5
    );
  }

  private recommendFullRestDay(signals: Record<string, any>): AgentRecommendation {
    const reasons = [];
    if (signals.sleepQuality && signals.sleepQuality < 3) {
      reasons.push(`poor sleep quality (${signals.sleepQuality}/5)`);
    }
    if (signals.energyRating && signals.energyRating < 2) {
      reasons.push(`critically low energy (${signals.energyRating}/5)`);
    }
    if (signals.consecutiveActiveDays >= 5) {
      reasons.push(`${signals.consecutiveActiveDays} consecutive active days`);
    }

    return this.createRecommendation(
      'Cancel all planned activities - full rest day required',
      `Recovery day needed due to: ${reasons.join(', ')}. ` +
      'Traveler well-being requires complete rest to prevent burnout and maintain trip enjoyment.',
      signals,
      [
        'Cancel all scheduled activities for the day',
        'Schedule spa or massage treatment',
        'Allow sleeping in without alarm',
        'Light pool or lounge time only',
        'Early dinner and bedtime'
      ],
      {
        approvalRequired: true,
        priority: 'critical',
      }
    );
  }

  /**
   * Rule: Cap walking-heavy days to <8,000 steps
   */
  private requiresActivityModeration(
    signals: Record<string, any>,
    context: HealthRecoveryContext
  ): boolean {
    if (!context.plannedActivity) return false;

    return (
      (signals.plannedSteps && signals.plannedSteps > signals.stepsTarget) ||
      (signals.physicalLoad === 'high' && signals.energyRating && signals.energyRating < 4) ||
      (signals.consecutiveActiveDays >= 3 && signals.physicalLoad === 'high')
    );
  }

  private recommendActivityModeration(
    signals: Record<string, any>,
    context: HealthRecoveryContext
  ): AgentRecommendation {
    const substitutions = [];

    if (signals.plannedSteps && signals.plannedSteps > signals.stepsTarget) {
      substitutions.push(
        `Reduce walking to <${signals.stepsTarget} steps`,
        'Consider private car for longer distances',
        'Schedule midday rest break'
      );
    }

    if (context.plannedActivity?.type === 'cultural') {
      substitutions.push(
        'Select seated cultural experience (theater, tea ceremony)',
        'Avoid walking tours',
        'Choose venue with climate control'
      );
    }

    return this.createRecommendation(
      'Moderate planned activity to reduce physical load',
      `Current activity plan exceeds recommended load for energy level ${signals.energyRating}/5 ` +
      `after ${signals.consecutiveActiveDays} consecutive active days.`,
      signals,
      substitutions,
      {
        approvalRequired: true,
        priority: 'high',
      }
    );
  }

  /**
   * Rule: Insert spa, massage, or pool time proactively
   */
  private shouldInsertWellnessActivity(signals: Record<string, any>): boolean {
    return (
      signals.consecutiveActiveDays >= 3 ||
      (signals.energyRating && signals.energyRating === 3) ||
      (signals.sleepQuality && signals.sleepQuality === 3)
    );
  }

  private recommendWellnessActivity(signals: Record<string, any>): AgentRecommendation {
    return this.createRecommendation(
      'Insert wellness activity into schedule',
      'Proactive recovery recommended to maintain energy levels and prevent fatigue accumulation.',
      signals,
      [
        'Schedule 60-90 minute spa treatment',
        'Afternoon pool or relaxation time',
        'Early evening with no commitments',
        'Light, digestible dinner',
        'Ensure 8+ hours sleep opportunity'
      ],
      {
        approvalRequired: false,
        priority: 'medium',
      }
    );
  }
}
