/**
 * CarePeers MCP Client
 *
 * Integrates with CarePeers Experience Lab via Model Context Protocol
 * to access wellness profiles and health data
 */

import { WellnessProfile } from '../types/schema';

export interface CarepeersWellnessData {
  userId: string;
  who5Score: number;
  lifestylePillars: {
    sleep: { quality: number; duration: number; consistency: number };
    stress: { level: number; sources: string[]; copingMechanisms: string[] };
    nutrition: { mealRegularity: number; dietPattern: string; hydration: number };
    movement: { activityLevel: number; weeklyExercise: number; mobility: string };
    socialConnection: { relationshipQuality: number; lonelinessRisk: number };
    substanceUse: { alcohol: string; tobacco: string; medications: string[] };
  };
  assessmentDate: string;
  stageAssignment: 'wellness_prevention' | 'active_senior' | 'care_coordination';
}

export class CarePeersMCPClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Fetch wellness profile from CarePeers
   */
  async getWellnessProfile(userId: string): Promise<WellnessProfile> {
    try {
      // TODO: Implement actual MCP protocol communication
      // For now, this is a placeholder that would make HTTP request to CarePeers MCP endpoint

      const response = await this.mcpRequest('wellness.getProfile', { userId });

      return this.transformToWellnessProfile(response);
    } catch (error) {
      console.error('Failed to fetch wellness profile from CarePeers:', error);
      throw new Error(`CarePeers MCP Error: ${error}`);
    }
  }

  /**
   * Update wellness data from travel activities
   */
  async updateWellnessLog(
    userId: string,
    date: string,
    data: {
      sleep?: { quality: number; duration: number };
      movement?: { steps: number; activityMinutes: number };
      stress?: { level: number; notes?: string };
      nutrition?: { meals: number; hydration: number };
    }
  ): Promise<void> {
    try {
      await this.mcpRequest('wellness.updateLog', {
        userId,
        date,
        ...data,
      });
    } catch (error) {
      console.error('Failed to update wellness log:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Get activity difficulty recommendations based on wellness profile
   */
  async getActivityRecommendations(
    userId: string,
    activityType: string
  ): Promise<{
    recommended: boolean;
    maxDuration?: number; // minutes
    requiredBreaks?: number;
    warnings?: string[];
  }> {
    try {
      const response = await this.mcpRequest('wellness.getActivityRecommendations', {
        userId,
        activityType,
      });

      return response;
    } catch (error) {
      console.error('Failed to get activity recommendations:', error);
      // Return permissive defaults on error
      return {
        recommended: true,
        warnings: ['Unable to fetch wellness recommendations'],
      };
    }
  }

  /**
   * Internal MCP request handler
   */
  private async mcpRequest(method: string, params: any): Promise<any> {
    // TODO: Implement actual MCP protocol
    // This would use @modelcontextprotocol/sdk

    // For MVP, use simple HTTP REST endpoint
    const response = await fetch(`${this.baseUrl}/mcp/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Transform CarePeers wellness data to our schema
   */
  private transformToWellnessProfile(data: CarepeersWellnessData): WellnessProfile {
    return {
      userId: data.userId,
      who5Score: data.who5Score,
      sleepQuality: this.mapSleepQuality(data.lifestylePillars.sleep.quality),
      energyLevel: this.mapEnergyLevel(data.who5Score),
      stepsTarget: this.calculateStepsTarget(data.lifestylePillars.movement),
      dietaryRestrictions: this.extractDietaryRestrictions(data.lifestylePillars.nutrition),
      medicalConditions: [], // Would need additional endpoint
      mobilityLevel: this.mapMobilityLevel(data.lifestylePillars.movement.mobility),
      medicationSchedule: this.extractMedicationSchedule(data.lifestylePillars.substanceUse),
    };
  }

  private mapSleepQuality(quality: number): number {
    // CarePeers uses 0-100, we use 1-5
    return Math.max(1, Math.min(5, Math.round(quality / 20)));
  }

  private mapEnergyLevel(who5Score: number): 'low' | 'medium' | 'high' {
    if (who5Score < 35) return 'low';
    if (who5Score < 70) return 'medium';
    return 'high';
  }

  private calculateStepsTarget(movement: CarepeersWellnessData['lifestylePillars']['movement']): number {
    // Adjust steps target based on activity level and mobility
    const baseSteps = 8000;
    const activityMultiplier = movement.activityLevel / 100; // 0-1 scale

    if (movement.mobility === 'limited') return 5000;
    if (movement.mobility === 'moderate') return 6500;

    return Math.round(baseSteps * (0.7 + 0.3 * activityMultiplier));
  }

  private extractDietaryRestrictions(
    nutrition: CarepeersWellnessData['lifestylePillars']['nutrition']
  ): string[] {
    // Would extract from diet pattern
    const restrictions: string[] = [];

    if (nutrition.dietPattern.includes('vegetarian')) {
      restrictions.push('vegetarian');
    }
    if (nutrition.dietPattern.includes('vegan')) {
      restrictions.push('vegan');
    }
    if (nutrition.dietPattern.includes('gluten')) {
      restrictions.push('gluten-free');
    }

    return restrictions;
  }

  private mapMobilityLevel(mobility: string): 'full' | 'moderate' | 'limited' {
    const lower = mobility.toLowerCase();
    if (lower.includes('limited') || lower.includes('restricted')) return 'limited';
    if (lower.includes('moderate') || lower.includes('some')) return 'moderate';
    return 'full';
  }

  private extractMedicationSchedule(
    substanceUse: CarepeersWellnessData['lifestylePillars']['substanceUse']
  ) {
    // Simple extraction - would need more detailed endpoint
    return substanceUse.medications.map(med => ({
      name: med,
      frequency: 'daily', // Would need more data
      timing: 'morning', // Would need more data
    }));
  }
}
