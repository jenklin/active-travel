/**
 * Travel Experience Agent (TXA)
 *
 * Main orchestrator for the Slow Luxury Travel service
 * Coordinates all sub-agents and makes final decisions
 *
 * Based on Section 11A from asia_golf_culture_itinerary.md
 */

import { BaseAgent, AgentContext, AgentRecommendation } from './base-agent';
import { HealthRecoveryAgent } from './health-recovery-agent';
import { GolfOperationsAgent } from './golf-operations-agent';
import { BudgetControlAgent } from './budget-control-agent';
import { TransportLogisticsAgent } from './transport-logistics-agent';
import { DailyItinerary, Trip, WellnessProfile } from '../types/schema';

interface TravelExperienceContext extends AgentContext {
  trip: Trip;
  wellnessProfile?: WellnessProfile;
  currentItinerary: DailyItinerary;
  travelerFeedback?: {
    energyRating?: number;
    sleepQuality?: number;
    satisfactionScore?: number;
    notes?: string;
  };
  weather?: {
    condition: string;
    temperature: number;
    humidity: number;
  };
  budgetStatus: {
    totalSpent: number;
    remainingBudget: number;
  };
}

export class TravelExperienceAgent extends BaseAgent {
  private healthAgent: HealthRecoveryAgent;
  private golfAgent: GolfOperationsAgent;
  private budgetAgent: BudgetControlAgent;
  private transportAgent: TransportLogisticsAgent;

  constructor() {
    super('travel_experience', 'Travel Experience Agent (TXA)');

    // Initialize sub-agents
    this.healthAgent = new HealthRecoveryAgent();
    this.golfAgent = new GolfOperationsAgent();
    this.budgetAgent = new BudgetControlAgent();
    this.transportAgent = new TransportLogisticsAgent();
  }

  /**
   * Main orchestration method
   * Coordinates all sub-agents and makes final decisions based on their recommendations
   */
  async analyze(context: TravelExperienceContext): Promise<AgentRecommendation> {
    this.validateContext(context, [
      'tripId',
      'userId',
      'date',
      'trip',
      'currentItinerary',
    ]);

    this.log('info', 'TXA beginning daily analysis', {
      date: context.date,
      location: context.currentItinerary.location,
      primaryIntent: context.currentItinerary.primaryIntent,
    });

    // Collect recommendations from all sub-agents in parallel
    const [healthRec, golfRec, budgetRec, transportRec] = await Promise.all([
      this.getHealthRecommendation(context),
      this.getGolfRecommendation(context),
      this.getBudgetRecommendation(context),
      this.getTransportRecommendation(context),
    ]);

    const recommendations = {
      health: healthRec,
      golf: golfRec,
      budget: budgetRec,
      transport: transportRec,
    };

    // Apply priority rules and make final decision
    const finalDecision = this.applyCoordinationRules(recommendations, context);

    this.log('info', 'TXA final decision', {
      decision: finalDecision.decision,
      priority: finalDecision.priority,
    });

    return finalDecision;
  }

  /**
   * Get health & recovery recommendation
   */
  private async getHealthRecommendation(
    context: TravelExperienceContext
  ): Promise<AgentRecommendation> {
    try {
      const healthContext = {
        ...context,
        sleepQuality: context.travelerFeedback?.sleepQuality,
        energyRating: context.travelerFeedback?.energyRating,
        consecutiveActiveDays: this.calculateConsecutiveActiveDays(context),
        wellnessProfile: context.wellnessProfile,
        plannedActivity: this.extractPlannedActivity(context.currentItinerary),
      };

      return await this.healthAgent.analyze(healthContext);
    } catch (error) {
      this.log('error', 'Health agent analysis failed', error);
      throw error;
    }
  }

  /**
   * Get golf operations recommendation
   */
  private async getGolfRecommendation(
    context: TravelExperienceContext
  ): Promise<AgentRecommendation> {
    try {
      const golfContext = {
        ...context,
        location: context.currentItinerary.location,
        energyLevel: context.travelerFeedback?.energyRating,
        weatherForecast: context.weather,
        consecutiveGolfDays: this.calculateConsecutiveGolfDays(context),
        availableCourses: [], // Would be populated from database/API
      };

      return await this.golfAgent.analyze(golfContext);
    } catch (error) {
      this.log('error', 'Golf agent analysis failed', error);
      throw error;
    }
  }

  /**
   * Get budget control recommendation
   */
  private async getBudgetRecommendation(
    context: TravelExperienceContext
  ): Promise<AgentRecommendation> {
    try {
      const budgetContext = {
        ...context,
        trip: context.trip,
        categorySpend: this.buildCategorySpend(context.trip),
      };

      return await this.budgetAgent.analyze(budgetContext);
    } catch (error) {
      this.log('error', 'Budget agent analysis failed', error);
      throw error;
    }
  }

  /**
   * Get transport logistics recommendation
   */
  private async getTransportRecommendation(
    context: TravelExperienceContext
  ): Promise<AgentRecommendation> {
    try {
      const transportContext = {
        ...context,
        currentLocation: context.currentItinerary.location,
        // Would extract next destination from itinerary
      };

      return await this.transportAgent.analyze(transportContext);
    } catch (error) {
      this.log('error', 'Transport agent analysis failed', error);
      throw error;
    }
  }

  /**
   * Apply coordination rules from Section 11G
   *
   * Rules:
   * - Sub-agents provide recommendations only
   * - TXA makes all final decisions
   * - If recommendations conflict, prioritize: health > logistics > novelty
   */
  private applyCoordinationRules(
    recommendations: {
      health: AgentRecommendation;
      golf: AgentRecommendation;
      budget: AgentRecommendation;
      transport: AgentRecommendation;
    },
    context: TravelExperienceContext
  ): AgentRecommendation {
    const { health, golf, budget, transport } = recommendations;

    // PRIORITY 1: Health & Safety (highest priority)
    if (health.priority === 'critical' || health.priority === 'high') {
      return this.createRecommendation(
        'Health priority override',
        'Health & recovery agent recommends intervention. ' +
        `Health rationale: ${health.rationale}`,
        {
          healthRecommendation: health,
          otherRecommendations: { golf, budget, transport },
        },
        [
          ...health.outputActions,
          '',
          'Other agent recommendations deferred to prioritize well-being.',
        ],
        {
          approvalRequired: health.approvalRequired,
          priority: health.priority,
        }
      );
    }

    // PRIORITY 2: Logistics & Transport (must be reliable)
    if (transport.priority === 'critical' || transport.priority === 'high') {
      return this.createRecommendation(
        'Logistics priority override',
        'Transport logistics require adjustment. ' +
        `Transport rationale: ${transport.rationale}`,
        {
          transportRecommendation: transport,
          healthRecommendation: health,
        },
        [
          ...transport.outputActions,
          '',
          'Schedule adjusted to ensure reliable transport.',
        ],
        {
          approvalRequired: transport.approvalRequired,
          priority: transport.priority,
        }
      );
    }

    // PRIORITY 3: Budget Control (important but not urgent)
    if (budget.priority === 'critical') {
      return this.createRecommendation(
        'Budget control intervention',
        'Critical budget variance detected. ' +
        `Budget rationale: ${budget.rationale}`,
        {
          budgetRecommendation: budget,
          healthStatus: health,
        },
        [
          ...budget.outputActions,
          '',
          'Spending adjustments required before proceeding.',
        ],
        {
          approvalRequired: true,
          priority: 'critical',
        }
      );
    }

    // PRIORITY 4: Activity optimization (golf, culture, etc.)
    // Only matters if health and logistics are OK
    if (golf.approvalRequired) {
      return this.createRecommendation(
        'Golf activity adjustment recommended',
        golf.rationale,
        {
          golfRecommendation: golf,
          healthStatus: health,
        },
        golf.outputActions,
        {
          approvalRequired: true,
          priority: golf.priority,
        }
      );
    }

    // All systems nominal - proceed with plan
    return this.createRecommendation(
      'Proceed with planned itinerary',
      this.buildNominalSummary(context, recommendations),
      {
        allRecommendations: recommendations,
      },
      [
        'All agent assessments favorable',
        'Health: ' + health.decision,
        'Transport: ' + transport.decision,
        'Budget: ' + budget.decision,
        'Golf: ' + golf.decision,
      ],
      {
        approvalRequired: false,
        priority: 'low',
      }
    );
  }

  // Helper methods

  private calculateConsecutiveActiveDays(context: TravelExperienceContext): number {
    // TODO: Would query database for recent days
    // For now, estimate from current intent
    return context.currentItinerary.primaryIntent === 'recovery' ? 0 : 1;
  }

  private calculateConsecutiveGolfDays(context: TravelExperienceContext): number {
    // TODO: Would query database for recent golf activities
    return 0;
  }

  private extractPlannedActivity(itinerary: DailyItinerary) {
    const activities = [
      itinerary.schedule.morning?.activity,
      itinerary.schedule.afternoon?.activity,
    ].filter(Boolean);

    if (activities.length === 0) return undefined;

    // Simple heuristic for physical load
    const hasGolf = itinerary.primaryIntent === 'golf';
    const hasCulture = itinerary.primaryIntent === 'culture';

    return {
      type: itinerary.primaryIntent,
      physicalLoad: hasGolf ? 'high' : hasCulture ? 'medium' : 'low',
      estimatedSteps: hasGolf ? 10000 : hasCulture ? 6000 : 3000,
    } as const;
  }

  private buildCategorySpend(trip: Trip) {
    return Object.entries(trip.budget.categories).reduce((acc, [category, planned]) => {
      acc[category] = {
        planned: planned || 0,
        actual: 0, // TODO: Would query from actual spend records
      };
      return acc;
    }, {} as Record<string, { planned: number; actual: number }>);
  }

  private buildNominalSummary(
    context: TravelExperienceContext,
    recommendations: Record<string, AgentRecommendation>
  ): string {
    const parts = [
      `Day proceeding as planned in ${context.currentItinerary.location}.`,
      `Primary focus: ${context.currentItinerary.primaryIntent}.`,
    ];

    if (context.travelerFeedback?.energyRating) {
      parts.push(`Energy level: ${context.travelerFeedback.energyRating}/5.`);
    }

    parts.push('All systems green.');

    return parts.join(' ');
  }
}
