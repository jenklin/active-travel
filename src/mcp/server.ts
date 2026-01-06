/**
 * MCP Server for Slow Luxury Travel Experience Lab
 *
 * Exposes travel planning agents as MCP tools and resources
 * Enables A2A (Agent-to-Agent) communication with other services
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { TravelExperienceAgent } from '../agents/travel-experience-agent';
import { HealthRecoveryAgent } from '../agents/health-recovery-agent';
import { GolfOperationsAgent } from '../agents/golf-operations-agent';
import { BudgetControlAgent } from '../agents/budget-control-agent';
import { TransportLogisticsAgent } from '../agents/transport-logistics-agent';

/**
 * Slow Luxury Travel MCP Server
 *
 * Service Type: Experience Lab
 * Category: Travel & Wellness
 * Capabilities: Trip planning, health-aware scheduling, agent-based decision making
 */
export class SlowLuxuryTravelMCPServer {
  private server: Server;
  private travelAgent: TravelExperienceAgent;
  private healthAgent: HealthRecoveryAgent;
  private golfAgent: GolfOperationsAgent;
  private budgetAgent: BudgetControlAgent;
  private transportAgent: TransportLogisticsAgent;

  constructor() {
    this.server = new Server(
      {
        name: 'active-travel',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize agents
    this.travelAgent = new TravelExperienceAgent();
    this.healthAgent = new HealthRecoveryAgent();
    this.golfAgent = new GolfOperationsAgent();
    this.budgetAgent = new BudgetControlAgent();
    this.transportAgent = new TransportLogisticsAgent();

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools (agent capabilities)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_daily_itinerary',
          description:
            'Analyze a daily travel itinerary using multi-agent system. ' +
            'Evaluates health, golf operations, budget, and transport logistics. ' +
            'Returns recommendations with priority levels and required actions.',
          inputSchema: {
            type: 'object',
            properties: {
              tripId: { type: 'string', description: 'Unique trip identifier' },
              userId: { type: 'string', description: 'User identifier' },
              date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
              currentItinerary: {
                type: 'object',
                description: 'Daily itinerary with schedule, health metrics, and spend',
              },
              travelerFeedback: {
                type: 'object',
                description: 'Previous day feedback (energy, sleep, satisfaction)',
              },
              weather: {
                type: 'object',
                description: 'Weather forecast (condition, temperature, humidity)',
              },
            },
            required: ['tripId', 'userId', 'date', 'currentItinerary'],
          },
        },
        {
          name: 'health_recovery_analysis',
          description:
            'Specialized health and recovery analysis for travel activities. ' +
            'Monitors sleep quality, energy levels, consecutive active days. ' +
            'Recommends rest days, activity moderation, and wellness interventions.',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              date: { type: 'string' },
              sleepQuality: { type: 'number', minimum: 1, maximum: 5 },
              energyRating: { type: 'number', minimum: 1, maximum: 5 },
              consecutiveActiveDays: { type: 'number' },
              plannedActivity: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  physicalLoad: { type: 'string', enum: ['low', 'medium', 'high'] },
                  estimatedSteps: { type: 'number' },
                },
              },
            },
            required: ['userId', 'date', 'consecutiveActiveDays'],
          },
        },
        {
          name: 'golf_operations_planning',
          description:
            'Optimize golf course selection and scheduling for Vietnam locations. ' +
            'Weather-aware substitutions, tee time recommendations, and fatigue prevention.',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              date: { type: 'string' },
              location: { type: 'string' },
              energyLevel: { type: 'number', minimum: 1, maximum: 5 },
              consecutiveGolfDays: { type: 'number' },
              weatherForecast: {
                type: 'object',
                properties: {
                  condition: { type: 'string' },
                  temperature: { type: 'number' },
                  humidity: { type: 'number' },
                },
              },
              availableCourses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    travelTime: { type: 'number' },
                    difficulty: { type: 'string' },
                    climate: { type: 'string' },
                  },
                },
              },
            },
            required: ['userId', 'date', 'location', 'consecutiveGolfDays'],
          },
        },
        {
          name: 'budget_control_check',
          description:
            'Monitor trip budget and spending by category. ' +
            'Alerts on variances, recommends reallocations, identifies unused prepaid value.',
          inputSchema: {
            type: 'object',
            properties: {
              tripId: { type: 'string' },
              userId: { type: 'string' },
              date: { type: 'string' },
              trip: { type: 'object' },
              categorySpend: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    planned: { type: 'number' },
                    actual: { type: 'number' },
                  },
                },
              },
            },
            required: ['tripId', 'userId', 'date', 'trip', 'categorySpend'],
          },
        },
        {
          name: 'transport_logistics_review',
          description:
            'Ensure transport reliability with adequate buffers. ' +
            'Identifies risks (luggage, mobility, early departures) and recommends mitigations.',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              date: { type: 'string' },
              currentLocation: { type: 'string' },
              nextDestination: { type: 'string' },
              transportType: {
                type: 'string',
                enum: ['flight', 'train', 'private_car', 'taxi'],
              },
              departureTime: { type: 'string' },
              arrivalTime: { type: 'string' },
            },
            required: ['userId', 'date', 'currentLocation'],
          },
        },
        {
          name: 'create_trip',
          description:
            'Create a new trip with traveler preferences and wellness integration. ' +
            'Initializes trip with budget, dates, travelers, and fetches wellness profiles.',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              name: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              budget: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  categories: { type: 'object' },
                },
              },
              travelers: { type: 'array' },
            },
            required: ['userId', 'name', 'startDate', 'endDate', 'budget'],
          },
        },
        {
          name: 'get_wellness_constraints',
          description:
            'Fetch wellness profile and convert to travel constraints. ' +
            'Integrates with CarePeers MCP to get health data for activity planning.',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
            },
            required: ['userId'],
          },
        },
      ],
    }));

    // List available resources (trip data, itineraries, agent decisions)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'slt://trips',
          name: 'All Trips',
          description: 'List of all trips managed by Slow Luxury Travel',
          mimeType: 'application/json',
        },
        {
          uri: 'slt://trips/{tripId}',
          name: 'Trip Details',
          description: 'Detailed information about a specific trip',
          mimeType: 'application/json',
        },
        {
          uri: 'slt://trips/{tripId}/itinerary',
          name: 'Trip Itinerary',
          description: 'Daily itinerary for a trip',
          mimeType: 'application/json',
        },
        {
          uri: 'slt://trips/{tripId}/decisions',
          name: 'Agent Decisions',
          description: 'Audit log of all agent decisions for a trip',
          mimeType: 'application/json',
        },
        {
          uri: 'slt://lab/info',
          name: 'Experience Lab Info',
          description: 'Information about the Slow Luxury Travel Experience Lab',
          mimeType: 'application/json',
        },
        {
          uri: 'slt://lab/capabilities',
          name: 'Lab Capabilities',
          description: 'Detailed capabilities and agent specifications',
          mimeType: 'application/json',
        },
      ],
    }));

    // Read resource data
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'slt://lab/info') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  labId: 'active-travel',
                  name: 'Slow Luxury Travel Experience Lab',
                  description:
                    'Agent-operated premium travel service with wellness integration. ' +
                    'Multi-week international trips with golf, culture, and health-aware scheduling.',
                  category: 'travel_wellness',
                  targetAudience: '50-65 year old professionals',
                  serviceType: 'human_in_loop_ai_agents',
                  capabilities: [
                    'Multi-agent trip planning',
                    'Health-aware activity scheduling',
                    'Golf operations optimization (Vietnam)',
                    'Budget control and reallocation',
                    'Transport logistics reliability',
                    'Wellness integration via CarePeers MCP',
                  ],
                  integrations: ['carepeers_wellness_profile'],
                  pricing: {
                    model: 'per_trip',
                    tiers: [
                      {
                        name: 'Premium Planning',
                        description: 'Full agent-operated planning and execution',
                        basePrice: 2500,
                        currency: 'USD',
                      },
                    ],
                  },
                  status: 'beta',
                  version: '0.1.0',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (uri === 'slt://lab/capabilities') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  agents: [
                    {
                      name: 'Travel Experience Agent (TXA)',
                      role: 'orchestrator',
                      description: 'Main coordinator, makes final decisions',
                      priority: 'Health > Logistics > Budget > Novelty',
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
                    },
                    {
                      name: 'Budget Control Agent',
                      role: 'specialist',
                      description: 'Monitors spending, recommends reallocations',
                      thresholds: {
                        alert: '10% variance',
                        critical: '20% variance',
                      },
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
                    planned: ['amadeus_flights', 'booking_hotels', 'google_maps', 'weather_api'],
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // TODO: Implement trip resource reading from database
      throw new Error(`Resource not found: ${uri}`);
    });

    // Handle tool calls (agent invocations)
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_daily_itinerary':
            return await this.handleAnalyzeDailyItinerary(args);

          case 'health_recovery_analysis':
            return await this.handleHealthRecoveryAnalysis(args);

          case 'golf_operations_planning':
            return await this.handleGolfOperationsPlanning(args);

          case 'budget_control_check':
            return await this.handleBudgetControlCheck(args);

          case 'transport_logistics_review':
            return await this.handleTransportLogisticsReview(args);

          case 'create_trip':
            return await this.handleCreateTrip(args);

          case 'get_wellness_constraints':
            return await this.handleGetWellnessConstraints(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Tool handlers

  private async handleAnalyzeDailyItinerary(args: any) {
    const recommendation = await this.travelAgent.analyze({
      tripId: args.tripId,
      userId: args.userId,
      date: args.date,
      trip: args.trip,
      currentItinerary: args.currentItinerary,
      travelerFeedback: args.travelerFeedback,
      weather: args.weather,
      wellnessProfile: args.wellnessProfile,
      budgetStatus: args.budgetStatus,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(recommendation, null, 2),
        },
      ],
    };
  }

  private async handleHealthRecoveryAnalysis(args: any) {
    const recommendation = await this.healthAgent.analyze({
      tripId: args.tripId || 'temp',
      userId: args.userId,
      date: args.date,
      sleepQuality: args.sleepQuality,
      energyRating: args.energyRating,
      consecutiveActiveDays: args.consecutiveActiveDays,
      plannedActivity: args.plannedActivity,
      wellnessProfile: args.wellnessProfile,
      environmentalStress: args.environmentalStress,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(recommendation, null, 2),
        },
      ],
    };
  }

  private async handleGolfOperationsPlanning(args: any) {
    const recommendation = await this.golfAgent.analyze({
      tripId: args.tripId || 'temp',
      userId: args.userId,
      date: args.date,
      location: args.location,
      energyLevel: args.energyLevel,
      consecutiveGolfDays: args.consecutiveGolfDays,
      weatherForecast: args.weatherForecast,
      availableCourses: args.availableCourses || [],
      recentRounds: args.recentRounds,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(recommendation, null, 2),
        },
      ],
    };
  }

  private async handleBudgetControlCheck(args: any) {
    const recommendation = await this.budgetAgent.analyze({
      tripId: args.tripId,
      userId: args.userId,
      date: args.date,
      trip: args.trip,
      categorySpend: args.categorySpend,
      upcomingExpenses: args.upcomingExpenses,
      unusedPrepaid: args.unusedPrepaid,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(recommendation, null, 2),
        },
      ],
    };
  }

  private async handleTransportLogisticsReview(args: any) {
    const recommendation = await this.transportAgent.analyze({
      tripId: args.tripId || 'temp',
      userId: args.userId,
      date: args.date,
      currentLocation: args.currentLocation,
      nextDestination: args.nextDestination,
      transportType: args.transportType,
      departureTime: args.departureTime,
      arrivalTime: args.arrivalTime,
      luggageCount: args.luggageCount,
      mobilityConsiderations: args.mobilityConsiderations,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(recommendation, null, 2),
        },
      ],
    };
  }

  private async handleCreateTrip(args: any) {
    // TODO: Implement database persistence
    const trip = {
      id: `trip_${Date.now()}`,
      userId: args.userId,
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      budget: args.budget,
      travelers: args.travelers,
      status: 'planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              trip,
              message: 'Trip created successfully',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGetWellnessConstraints(args: any) {
    // TODO: Call CarePeers MCP to fetch wellness profile
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'Wellness constraints require CarePeers MCP integration',
              userId: args.userId,
              status: 'pending_implementation',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Slow Luxury Travel MCP Server running on stdio');
  }
}

// Run server if executed directly
if (require.main === module) {
  const server = new SlowLuxuryTravelMCPServer();
  server.run().catch(console.error);
}
