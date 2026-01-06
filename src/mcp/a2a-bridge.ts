/**
 * A2A (Agent-to-Agent) Communication Bridge
 *
 * Enables bidirectional communication between Slow Luxury Travel
 * and other MCP services (especially CarePeers)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { WellnessProfile } from '../types/schema';

export interface MCPServiceConfig {
  name: string;
  type: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * A2A Bridge for connecting to external MCP services
 */
export class A2ABridge {
  private clients: Map<string, Client> = new Map();
  private connections: Map<string, any> = new Map();

  /**
   * Connect to an external MCP service
   */
  async connectToService(config: MCPServiceConfig): Promise<void> {
    try {
      console.error(`[A2A] Connecting to ${config.name}...`);

      const client = new Client(
        {
          name: 'slow-luxury-travel-client',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      );

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      await client.connect(transport);

      this.clients.set(config.name, client);
      this.connections.set(config.name, { config, transport });

      console.error(`[A2A] Connected to ${config.name} successfully`);
    } catch (error) {
      console.error(`[A2A] Failed to connect to ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from a service
   */
  async disconnectFromService(serviceName: string): Promise<void> {
    const client = this.clients.get(serviceName);
    if (client) {
      await client.close();
      this.clients.delete(serviceName);
      this.connections.delete(serviceName);
      console.error(`[A2A] Disconnected from ${serviceName}`);
    }
  }

  /**
   * Disconnect from all services
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.keys()).map((name) =>
      this.disconnectFromService(name)
    );
    await Promise.all(promises);
  }

  /**
   * List available tools from a service
   */
  async listTools(serviceName: string): Promise<any[]> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Not connected to service: ${serviceName}`);
    }

    const response = await client.request(
      { method: 'tools/list' } as any,
      {} as any
    );

    return response.tools || [];
  }

  /**
   * Call a tool on a remote service
   */
  async callTool(
    serviceName: string,
    toolName: string,
    args: any
  ): Promise<any> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Not connected to service: ${serviceName}`);
    }

    const response = await client.request(
      {
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      } as any,
      {} as any
    );

    return response;
  }

  /**
   * Read a resource from a remote service
   */
  async readResource(serviceName: string, uri: string): Promise<any> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Not connected to service: ${serviceName}`);
    }

    const response = await client.request(
      {
        method: 'resources/read',
        params: { uri },
      } as any,
      {} as any
    );

    return response;
  }

  /**
   * Check if connected to a service
   */
  isConnected(serviceName: string): boolean {
    return this.clients.has(serviceName);
  }

  /**
   * Get list of connected services
   */
  getConnectedServices(): string[] {
    return Array.from(this.clients.keys());
  }
}

/**
 * CarePeers-specific A2A client
 * Wraps A2A bridge with CarePeers domain-specific methods
 */
export class CarepeersA2AClient {
  private bridge: A2ABridge;
  private readonly serviceName = 'carepeers';

  constructor(bridge: A2ABridge) {
    this.bridge = bridge;
  }

  /**
   * Connect to CarePeers MCP service
   */
  async connect(config: MCPServiceConfig): Promise<void> {
    await this.bridge.connectToService(config);
  }

  /**
   * Fetch wellness profile from CarePeers
   */
  async getWellnessProfile(userId: string): Promise<WellnessProfile> {
    try {
      const response = await this.bridge.callTool(this.serviceName, 'get_wellness_profile', {
        userId,
      });

      // Parse response and map to WellnessProfile schema
      const data = this.parseToolResponse(response);
      return this.mapToWellnessProfile(data);
    } catch (error) {
      console.error('[CarePeers A2A] Failed to fetch wellness profile:', error);
      throw new Error(`CarePeers wellness profile unavailable: ${error}`);
    }
  }

  /**
   * Update wellness log in CarePeers
   */
  async updateWellnessLog(
    userId: string,
    date: string,
    data: {
      sleep?: { quality: number; duration: number };
      movement?: { steps: number; activityMinutes: number };
      stress?: { level: number; notes?: string };
    }
  ): Promise<void> {
    try {
      await this.bridge.callTool(this.serviceName, 'update_wellness_log', {
        userId,
        date,
        ...data,
      });
    } catch (error) {
      console.error('[CarePeers A2A] Failed to update wellness log:', error);
      // Don't throw - wellness log updates are non-critical
    }
  }

  /**
   * Get activity recommendations from CarePeers
   */
  async getActivityRecommendations(
    userId: string,
    activityType: string
  ): Promise<{
    recommended: boolean;
    maxDuration?: number;
    requiredBreaks?: number;
    warnings?: string[];
  }> {
    try {
      const response = await this.bridge.callTool(
        this.serviceName,
        'get_activity_recommendations',
        {
          userId,
          activityType,
        }
      );

      return this.parseToolResponse(response);
    } catch (error) {
      console.error('[CarePeers A2A] Failed to get activity recommendations:', error);
      // Return permissive defaults
      return {
        recommended: true,
        warnings: ['CarePeers recommendations unavailable'],
      };
    }
  }

  /**
   * Subscribe to wellness profile updates (if CarePeers supports subscriptions)
   */
  async subscribeToWellnessUpdates(
    userId: string,
    callback: (profile: WellnessProfile) => void
  ): Promise<void> {
    // TODO: Implement MCP subscription mechanism when available
    console.warn('[CarePeers A2A] Wellness subscriptions not yet implemented');
  }

  /**
   * Parse MCP tool response
   */
  private parseToolResponse(response: any): any {
    if (response.content && response.content[0]?.text) {
      return JSON.parse(response.content[0].text);
    }
    return response;
  }

  /**
   * Map CarePeers data to WellnessProfile schema
   */
  private mapToWellnessProfile(data: any): WellnessProfile {
    return {
      userId: data.userId || data.user_id,
      who5Score: data.who5Score || data.who5_score || 50,
      sleepQuality: data.sleepQuality || data.sleep_quality || 3,
      energyLevel: data.energyLevel || data.energy_level || 'medium',
      stepsTarget: data.stepsTarget || data.steps_target || 8000,
      dietaryRestrictions: data.dietaryRestrictions || data.dietary_restrictions || [],
      medicalConditions: data.medicalConditions || data.medical_conditions || [],
      mobilityLevel: data.mobilityLevel || data.mobility_level || 'full',
      medicationSchedule: data.medicationSchedule || data.medication_schedule || [],
    };
  }
}

/**
 * Service Discovery Registry
 * Helps find and connect to available MCP services
 */
export class ServiceDiscoveryRegistry {
  private knownServices: Map<string, MCPServiceConfig> = new Map();

  /**
   * Register a known MCP service
   */
  registerService(config: MCPServiceConfig): void {
    this.knownServices.set(config.name, config);
  }

  /**
   * Get service configuration by name
   */
  getServiceConfig(name: string): MCPServiceConfig | undefined {
    return this.knownServices.get(name);
  }

  /**
   * List all registered services
   */
  listServices(): MCPServiceConfig[] {
    return Array.from(this.knownServices.values());
  }

  /**
   * Find services by type
   */
  findServicesByType(type: string): MCPServiceConfig[] {
    return this.listServices().filter((s) => s.type === type);
  }

  /**
   * Load services from environment or configuration
   */
  loadFromEnvironment(): void {
    // CarePeers service
    if (process.env.CAREPEERS_MCP_COMMAND) {
      this.registerService({
        name: 'carepeers',
        type: 'wellness_service',
        command: process.env.CAREPEERS_MCP_COMMAND,
        args: process.env.CAREPEERS_MCP_ARGS?.split(' ') || [],
        env: {
          CAREPEERS_API_KEY: process.env.CAREPEERS_API_KEY || '',
        },
      });
    }

    // Add more services as they become available
    // Example: Amadeus flight booking, Google Maps, etc.
  }
}

/**
 * Global A2A Manager
 * Singleton for managing all A2A connections
 */
export class A2AManager {
  private static instance: A2AManager;
  private bridge: A2ABridge;
  private registry: ServiceDiscoveryRegistry;
  private carepeersClient?: CarepeersA2AClient;

  private constructor() {
    this.bridge = new A2ABridge();
    this.registry = new ServiceDiscoveryRegistry();
    this.registry.loadFromEnvironment();
  }

  static getInstance(): A2AManager {
    if (!A2AManager.instance) {
      A2AManager.instance = new A2AManager();
    }
    return A2AManager.instance;
  }

  /**
   * Initialize all configured A2A connections
   */
  async initialize(): Promise<void> {
    console.error('[A2A Manager] Initializing A2A connections...');

    // Connect to CarePeers if configured
    const carepeersConfig = this.registry.getServiceConfig('carepeers');
    if (carepeersConfig) {
      try {
        this.carepeersClient = new CarepeersA2AClient(this.bridge);
        await this.carepeersClient.connect(carepeersConfig);
        console.error('[A2A Manager] CarePeers connected successfully');
      } catch (error) {
        console.error('[A2A Manager] CarePeers connection failed:', error);
        console.error('[A2A Manager] Continuing without CarePeers integration');
      }
    }

    // TODO: Connect to other services as needed
  }

  /**
   * Get CarePeers client
   */
  getCarePeersClient(): CarepeersA2AClient | undefined {
    return this.carepeersClient;
  }

  /**
   * Get raw bridge for custom integrations
   */
  getBridge(): A2ABridge {
    return this.bridge;
  }

  /**
   * Get service registry
   */
  getRegistry(): ServiceDiscoveryRegistry {
    return this.registry;
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    console.error('[A2A Manager] Shutting down A2A connections...');
    await this.bridge.disconnectAll();
  }
}
