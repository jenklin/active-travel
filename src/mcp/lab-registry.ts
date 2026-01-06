/**
 * Experience Lab Registry
 *
 * Allows Slow Luxury Travel to register itself as an Experience Lab
 * and be discovered by CloudPeers Platform and other aggregators
 */

import { TravelRepository } from '../database/repository';

export interface ExperienceLab {
  labId: string;
  name: string;
  description: string;
  category: string;
  targetAudience: string;
  serviceType: string;
  capabilities: string[];
  integrations: string[];
  pricing: {
    model: string;
    tiers: Array<{
      name: string;
      description: string;
      basePrice: number;
      currency: string;
    }>;
  };
  mcpEndpoint: string;
  status: 'beta' | 'production' | 'deprecated';
  version: string;
}

export interface LabActivation {
  userId: string;
  labId: string;
  activationRoute: string;
  userOutcome: string;
  selectedImportance?: number;
  sessionData?: any;
}

/**
 * Lab Registry Service
 * Manages lab registration and activation
 */
export class LabRegistryService {
  private repository: TravelRepository;

  constructor(repository: TravelRepository) {
    this.repository = repository;
  }

  /**
   * Get lab information for discovery
   */
  getLabInfo(): ExperienceLab {
    return {
      labId: 'active-living-lab',
      name: 'Active Living Lab',
      description:
        'Agent-operated premium travel service for active retirees. ' +
        'Multi-week international trips with golf, culture, wellness integration, and health-aware scheduling.',
      category: 'active_lifestyle',
      targetAudience: 'Active retirees (45-75 years old)',
      serviceType: 'human_in_loop_ai_agents',
      capabilities: [
        'Multi-agent trip planning',
        'Health-aware activity scheduling',
        'Golf operations optimization (Vietnam)',
        'Budget control and reallocation',
        'Transport logistics reliability',
        'Wellness integration via CarePeers MCP',
        'Daily adaptive recommendations',
        'Agent-based decision making',
      ],
      integrations: ['carepeers_wellness_profile', 'mcp_a2a_services'],
      pricing: {
        model: 'per_trip',
        tiers: [
          {
            name: 'Premium Planning',
            description:
              'Full agent-operated planning and execution for multi-week trips',
            basePrice: 2500,
            currency: 'USD',
          },
          {
            name: 'Golf Package Add-on',
            description: 'Specialized golf operations and course booking',
            basePrice: 1000,
            currency: 'USD',
          },
        ],
      },
      mcpEndpoint: process.env.MCP_ENDPOINT || 'stdio://active-living-lab',
      status: 'beta',
      version: '0.1.0',
    };
  }

  /**
   * Get detailed capabilities for other agents
   */
  getCapabilities(): any {
    return {
      agents: [
        {
          name: 'Travel Experience Agent (TXA)',
          role: 'orchestrator',
          description: 'Main coordinator, makes final decisions',
          priority: 'Health > Logistics > Budget > Novelty',
          mcpTools: ['analyze_daily_itinerary'],
        },
        {
          name: 'Health & Recovery Agent',
          role: 'specialist',
          description: 'Monitors well-being, recommends rest days',
          signals: ['sleep_quality', 'energy', 'consecutive_active_days'],
          rules: [
            'Force rest day if sleep <3/5 for 2 nights',
            'Cap walking to <8,000 steps',
            'Insert wellness activities after 3 active days',
          ],
          mcpTools: ['health_recovery_analysis'],
        },
        {
          name: 'Golf Operations Agent',
          role: 'specialist',
          description: 'Optimizes golf scheduling (Vietnam only)',
          signals: ['weather', 'energy', 'consecutive_golf_days'],
          rules: [
            'Max 3 rounds per 7-day period',
            'No back-to-back rounds if energy <4/5',
            'Substitute to Ba Na Hills in high heat',
          ],
          mcpTools: ['golf_operations_planning'],
        },
        {
          name: 'Budget Control Agent',
          role: 'specialist',
          description: 'Monitors spending, recommends reallocations',
          thresholds: {
            alert: '10% variance',
            critical: '20% variance',
          },
          mcpTools: ['budget_control_check'],
        },
        {
          name: 'Transport & Logistics Agent',
          role: 'specialist',
          description: 'Ensures reliable, low-stress transport',
          buffers: {
            international_flight: 120,
            domestic_flight: 90,
            golf_transfer: 45,
          },
          mcpTools: ['transport_logistics_review'],
        },
      ],
      dataModels: [
        'Trip',
        'DailyItinerary',
        'Activity',
        'GolfRound',
        'TransportSegment',
        'Accommodation',
        'WellnessProfile',
        'AgentDecision',
      ],
      externalIntegrations: {
        required: ['carepeers_mcp'],
        optional: ['amadeus_flights', 'booking_hotels', 'google_maps', 'weather_api'],
      },
      a2aProtocols: ['MCP 1.0'],
    };
  }

  /**
   * Create lab activation for a user
   */
  async activateLab(activation: LabActivation): Promise<string> {
    const activationId = await this.repository.createLabActivation({
      userId: activation.userId,
      activationRoute: activation.activationRoute,
      userOutcome: activation.userOutcome,
      selectedImportance: activation.selectedImportance,
      sessionData: activation.sessionData,
    });

    return activationId;
  }

  /**
   * Mark lab as launched for user
   */
  async markLaunched(activationId: string): Promise<void> {
    await this.repository.markLabLaunched(activationId);
  }

  /**
   * Get onboarding flow for lab
   */
  getOnboardingFlow(): any {
    return {
      steps: [
        {
          step: 1,
          type: 'welcome',
          title: 'Welcome to Active Living Lab',
          description:
            'Premium, agent-operated travel experiences designed for active retirees.',
          duration: '30 seconds',
        },
        {
          step: 2,
          type: 'outcome_selection',
          title: "What's your ideal trip?",
          options: [
            {
              label: 'Multi-week Asia exploration',
              value: 'multi_week_asia',
              description: 'Vietnam golf + Japan & Korea culture (3-5 weeks)',
            },
            {
              label: 'Golf-focused retreat',
              value: 'golf_focused',
              description: 'Intensive golf experience in Da Nang (1-2 weeks)',
            },
            {
              label: 'Wellness & culture balance',
              value: 'wellness_culture',
              description: 'Balanced wellness and cultural experiences',
            },
            {
              label: 'Custom itinerary',
              value: 'custom',
              description: 'Build your perfect trip with our agents',
            },
          ],
        },
        {
          step: 3,
          type: 'wellness_integration',
          title: 'Connect your wellness profile',
          description:
            'Link your CarePeers wellness profile for health-aware planning.',
          optional: true,
          benefits: [
            'Activity recommendations based on energy levels',
            'Automatic rest day suggestions',
            'Physical load optimization',
            'Dietary restrictions integration',
          ],
        },
        {
          step: 4,
          type: 'importance_rating',
          title: 'How important is this trip?',
          scale: {
            min: 1,
            max: 5,
            labels: {
              1: 'Exploring options',
              3: 'Seriously considering',
              5: 'Ready to book',
            },
          },
        },
        {
          step: 5,
          type: 'agent_preview',
          title: 'Meet your travel agents',
          description:
            'Our AI agents work together to plan your perfect trip.',
          agents: [
            'Travel Experience Agent (TXA)',
            'Health & Recovery Agent',
            'Golf Operations Agent',
            'Budget Control Agent',
            'Transport & Logistics Agent',
          ],
        },
        {
          step: 6,
          type: 'activation',
          title: 'Launch your planning experience',
          ctaText: 'Start Planning',
        },
      ],
      estimatedDuration: '3-5 minutes',
    };
  }

  /**
   * Export lab manifest for CloudPeers Platform
   * This allows the platform to discover and list this lab
   */
  exportManifest(): any {
    const labInfo = this.getLabInfo();
    const capabilities = this.getCapabilities();
    const onboarding = this.getOnboardingFlow();

    return {
      version: '1.0',
      type: 'experience_lab',
      lab: labInfo,
      capabilities,
      onboarding,
      mcpProtocol: {
        version: '1.0',
        transport: 'stdio',
        tools: capabilities.agents.flatMap((a: any) => a.mcpTools),
        resources: [
          'slt://trips',
          'slt://trips/{tripId}',
          'slt://trips/{tripId}/itinerary',
          'slt://trips/{tripId}/decisions',
          'slt://lab/info',
          'slt://lab/capabilities',
        ],
      },
      health: {
        endpoint: '/health',
        expectedStatus: 200,
      },
    };
  }
}

/**
 * CloudPeers Platform Integration
 * Helpers for integrating with the main CloudPeers platform
 */
export class CloudPeersPlatformIntegration {
  private labRegistry: LabRegistryService;

  constructor(labRegistry: LabRegistryService) {
    this.labRegistry = labRegistry;
  }

  /**
   * Handle activation from CloudPeers Platform
   * Called when user selects "multi-week trip" outcome and is routed here
   */
  async handlePlatformActivation(platformData: {
    userId: string;
    sessionId: string;
    selectedOutcome: string;
    selectedImportance: number;
    returnUrl?: string;
  }): Promise<{ activationId: string; nextSteps: any }> {
    // Create lab activation record
    const activationId = await this.labRegistry.activateLab({
      userId: platformData.userId,
      labId: 'active-living-lab',
      activationRoute: 'cloudpeers_platform',
      userOutcome: platformData.selectedOutcome,
      selectedImportance: platformData.selectedImportance,
      sessionData: {
        sessionId: platformData.sessionId,
        returnUrl: platformData.returnUrl,
        platformActivatedAt: new Date().toISOString(),
      },
    });

    // Get onboarding flow
    const onboarding = this.labRegistry.getOnboardingFlow();

    return {
      activationId,
      nextSteps: {
        message: 'Lab activation successful',
        onboarding,
        estimatedCompletion: '3-5 minutes',
      },
    };
  }

  /**
   * Report milestone back to CloudPeers Platform
   * e.g., trip booked, 30-day milestone, trip completed
   */
  async reportMilestone(milestone: {
    userId: string;
    tripId: string;
    type: 'trip_created' | 'trip_confirmed' | 'trip_completed' | '30_day' | '60_day' | '90_day';
    data?: any;
  }): Promise<void> {
    // TODO: Call CloudPeers Platform API to report milestone
    // This would trigger community celebrations, achievement unlocks, etc.
    console.log('[Platform Integration] Milestone reported:', milestone);
  }
}
