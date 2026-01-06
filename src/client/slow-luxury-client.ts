/**
 * Slow Luxury Travel - Programmatic Client SDK
 *
 * TypeScript client for calling travel agents programmatically via MCP
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  Trip,
  DailyItinerary,
  WellnessProfile,
  DailyFeedback,
} from '../types/schema';
import { AgentRecommendation } from '../agents/base-agent';

export interface SlowLuxuryClientConfig {
  /**
   * Path to the MCP server executable
   * Default: 'node'
   */
  command?: string;

  /**
   * Arguments to pass to the MCP server
   * Default: ['dist/mcp/server.js']
   */
  args?: string[];

  /**
   * Environment variables for the MCP server
   */
  env?: Record<string, string>;

  /**
   * Database connection string
   * If not provided, operations requiring persistence will fail
   */
  databaseUrl?: string;
}

/**
 * Main client for interacting with Slow Luxury Travel agents
 *
 * @example
 * ```typescript
 * const client = new SlowLuxuryClient({
 *   databaseUrl: process.env.DATABASE_URL,
 * });
 *
 * await client.connect();
 *
 * const recommendation = await client.analyzeDailyItinerary({
 *   tripId: 'trip_123',
 *   userId: 'user_123',
 *   date: '2026-02-20',
 *   currentItinerary: {...},
 *   travelerFeedback: {...},
 * });
 *
 * console.log(recommendation.decision);
 * await client.disconnect();
 * ```
 */
export class SlowLuxuryClient {
  private client: Client;
  private transport?: StdioClientTransport;
  private connected: boolean = false;
  private config: Required<SlowLuxuryClientConfig>;

  constructor(config: SlowLuxuryClientConfig = {}) {
    this.config = {
      command: config.command || 'node',
      args: config.args || ['dist/mcp/server.js'],
      env: config.env || {},
      databaseUrl: config.databaseUrl || '',
    };

    this.client = new Client(
      {
        name: 'slow-luxury-client',
        version: '0.1.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to the Slow Luxury Travel MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Client already connected');
    }

    this.transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args,
      env: {
        ...process.env,
        ...this.config.env,
        ...(this.config.databaseUrl && { DATABASE_URL: this.config.databaseUrl }),
      },
    });

    await this.client.connect(this.transport);
    this.connected = true;
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.client.close();
    this.connected = false;
  }

  /**
   * Ensure client is connected before making requests
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Client not connected. Call connect() first.');
    }
  }

  // ============================================================================
  // AGENT METHODS
  // ============================================================================

  /**
   * Analyze a daily itinerary with the full multi-agent system
   *
   * Runs all agents (Health, Golf, Budget, Transport) and returns
   * the Travel Experience Agent's final recommendation.
   */
  async analyzeDailyItinerary(params: {
    tripId: string;
    userId: string;
    date: string;
    trip: Trip;
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
    wellnessProfile?: WellnessProfile;
  }): Promise<AgentRecommendation> {
    this.ensureConnected();

    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'analyze_daily_itinerary',
          arguments: params,
        },
      } as any,
      {} as any
    );

    return this.parseToolResult(result);
  }

  /**
   * Get health and recovery recommendations
   *
   * Specialized analysis focused on sleep, energy, and physical load.
   */
  async getHealthRecoveryAnalysis(params: {
    userId: string;
    date: string;
    sleepQuality?: number;
    energyRating?: number;
    consecutiveActiveDays: number;
    plannedActivity?: {
      type: string;
      physicalLoad: 'low' | 'medium' | 'high';
      estimatedSteps?: number;
    };
    wellnessProfile?: WellnessProfile;
  }): Promise<AgentRecommendation> {
    this.ensureConnected();

    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'health_recovery_analysis',
          arguments: {
            tripId: 'temp',
            ...params,
          },
        },
      } as any,
      {} as any
    );

    return this.parseToolResult(result);
  }

  /**
   * Get golf operations recommendations (Vietnam only)
   *
   * Optimizes course selection, tee times, and weather-aware substitutions.
   */
  async getGolfOperationsPlanning(params: {
    userId: string;
    date: string;
    location: string;
    energyLevel?: number;
    consecutiveGolfDays: number;
    weatherForecast?: {
      condition: string;
      temperature: number;
      humidity: number;
      rainfall?: number;
    };
    availableCourses: Array<{
      name: string;
      travelTime: number;
      difficulty: 'easy' | 'moderate' | 'challenging';
      climate: 'hot' | 'cool' | 'mountain';
    }>;
  }): Promise<AgentRecommendation> {
    this.ensureConnected();

    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'golf_operations_planning',
          arguments: {
            tripId: 'temp',
            ...params,
          },
        },
      } as any,
      {} as any
    );

    return this.parseToolResult(result);
  }

  /**
   * Check budget status and get reallocation recommendations
   */
  async checkBudget(params: {
    tripId: string;
    userId: string;
    date: string;
    trip: Trip;
    categorySpend: Record<string, { planned: number; actual: number }>;
    upcomingExpenses?: Array<{
      category: string;
      amount: number;
      description: string;
    }>;
    unusedPrepaid?: Array<{
      category: string;
      amount: number;
      item: string;
    }>;
  }): Promise<AgentRecommendation> {
    this.ensureConnected();

    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'budget_control_check',
          arguments: params,
        },
      } as any,
      {} as any
    );

    return this.parseToolResult(result);
  }

  /**
   * Review transport logistics and get reliability recommendations
   */
  async reviewTransportLogistics(params: {
    userId: string;
    date: string;
    currentLocation: string;
    nextDestination?: string;
    transportType?: 'flight' | 'train' | 'private_car' | 'taxi';
    departureTime?: string;
    arrivalTime?: string;
    luggageCount?: number;
    mobilityConsiderations?: string[];
  }): Promise<AgentRecommendation> {
    this.ensureConnected();

    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'transport_logistics_review',
          arguments: {
            tripId: 'temp',
            ...params,
          },
        },
      } as any,
      {} as any
    );

    return this.parseToolResult(result);
  }

  /**
   * Create a new trip
   */
  async createTrip(params: {
    userId: string;
    name: string;
    startDate: string;
    endDate: string;
    budget: {
      total: number;
      categories: Record<string, number>;
    };
    travelers: Array<{
      id: string;
      name: string;
      email: string;
      wellnessProfileId?: string;
    }>;
  }): Promise<{ success: boolean; trip: Trip; message: string }> {
    this.ensureConnected();

    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'create_trip',
          arguments: params,
        },
      } as any,
      {} as any
    );

    return this.parseToolResult(result);
  }

  /**
   * Get wellness constraints from CarePeers (via A2A)
   */
  async getWellnessConstraints(params: {
    userId: string;
  }): Promise<WellnessProfile | { message: string; status: string }> {
    this.ensureConnected();

    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: 'get_wellness_constraints',
          arguments: params,
        },
      } as any,
      {} as any
    );

    return this.parseToolResult(result);
  }

  // ============================================================================
  // RESOURCE METHODS
  // ============================================================================

  /**
   * Get lab information
   */
  async getLabInfo(): Promise<any> {
    this.ensureConnected();

    const result = await this.client.request(
      {
        method: 'resources/read',
        params: { uri: 'slt://lab/info' },
      } as any,
      {} as any
    );

    return this.parseResourceResult(result);
  }

  /**
   * Get lab capabilities (detailed agent specifications)
   */
  async getLabCapabilities(): Promise<any> {
    this.ensureConnected();

    const result = await this.client.request(
      {
        method: 'resources/read',
        params: { uri: 'slt://lab/capabilities' },
      } as any,
      {} as any
    );

    return this.parseResourceResult(result);
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<any[]> {
    this.ensureConnected();

    const result = await this.client.request(
      { method: 'tools/list' } as any,
      {} as any
    );

    return result.tools || [];
  }

  /**
   * List all available resources
   */
  async listResources(): Promise<any[]> {
    this.ensureConnected();

    const result = await this.client.request(
      { method: 'resources/list' } as any,
      {} as any
    );

    return result.resources || [];
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Parse MCP tool result
   */
  private parseToolResult(result: any): any {
    if (result.content && result.content[0]?.text) {
      return JSON.parse(result.content[0].text);
    }
    return result;
  }

  /**
   * Parse MCP resource result
   */
  private parseResourceResult(result: any): any {
    if (result.contents && result.contents[0]?.text) {
      return JSON.parse(result.contents[0].text);
    }
    return result;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Convenience function to create and connect a client
 *
 * @example
 * ```typescript
 * const client = await createSlowLuxuryClient({
 *   databaseUrl: process.env.DATABASE_URL,
 * });
 *
 * // Use client...
 *
 * await client.disconnect();
 * ```
 */
export async function createSlowLuxuryClient(
  config?: SlowLuxuryClientConfig
): Promise<SlowLuxuryClient> {
  const client = new SlowLuxuryClient(config);
  await client.connect();
  return client;
}
