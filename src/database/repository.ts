/**
 * Database Repository Layer
 * Handles all database operations for Slow Luxury Travel
 */

import { Pool, PoolClient } from 'pg';
import {
  Trip,
  DailyItinerary,
  Activity,
  AgentDecision,
  WellnessProfile,
  DailyFeedback,
} from '../types/schema';

export class TravelRepository {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // ============================================================================
  // TRIPS
  // ============================================================================

  async createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO trips
         (user_id, name, start_date, end_date, status,
          budget_total, budget_spent, budget_currency, budget_categories)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          trip.userId,
          trip.name,
          trip.startDate,
          trip.endDate,
          trip.status,
          trip.budget.total,
          trip.budget.spent,
          trip.budget.currency,
          JSON.stringify(trip.budget.categories),
        ]
      );

      const tripId = result.rows[0].id;

      // Insert travelers
      for (const traveler of trip.travelers) {
        await client.query(
          `INSERT INTO travelers (trip_id, name, email, wellness_profile_id)
           VALUES ($1, $2, $3, $4)`,
          [tripId, traveler.name, traveler.email, traveler.wellnessProfileId]
        );
      }

      await client.query('COMMIT');

      return this.mapRowToTrip(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTripById(tripId: string): Promise<Trip | null> {
    const result = await this.pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTrip(result.rows[0]);
  }

  async getTripsByUserId(userId: string): Promise<Trip[]> {
    const result = await this.pool.query(
      'SELECT * FROM trips WHERE user_id = $1 ORDER BY start_date DESC',
      [userId]
    );

    return result.rows.map((row) => this.mapRowToTrip(row));
  }

  async updateTripStatus(tripId: string, status: Trip['status']): Promise<void> {
    await this.pool.query('UPDATE trips SET status = $1 WHERE id = $2', [status, tripId]);
  }

  async updateTripSpend(tripId: string, spent: number): Promise<void> {
    await this.pool.query('UPDATE trips SET budget_spent = $1 WHERE id = $2', [spent, tripId]);
  }

  // ============================================================================
  // DAILY ITINERARIES
  // ============================================================================

  async createDailyItinerary(
    itinerary: Omit<DailyItinerary, 'adjustments'>
  ): Promise<DailyItinerary> {
    const result = await this.pool.query(
      `INSERT INTO daily_itineraries
       (trip_id, date, location, primary_intent, energy_level, sleep_quality,
        schedule, health_data, spend_planned, spend_actual, agent_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        itinerary.tripId,
        itinerary.date,
        itinerary.location,
        itinerary.primaryIntent,
        itinerary.energyLevel,
        itinerary.sleepQuality,
        JSON.stringify(itinerary.schedule),
        JSON.stringify(itinerary.health),
        itinerary.spend.planned,
        itinerary.spend.actual,
        itinerary.agentNotes,
      ]
    );

    return this.mapRowToItinerary(result.rows[0]);
  }

  async getItineraryByDate(tripId: string, date: string): Promise<DailyItinerary | null> {
    const result = await this.pool.query(
      'SELECT * FROM daily_itineraries WHERE trip_id = $1 AND date = $2',
      [tripId, date]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToItinerary(result.rows[0]);
  }

  async getTripItinerary(tripId: string): Promise<DailyItinerary[]> {
    const result = await this.pool.query(
      'SELECT * FROM daily_itineraries WHERE trip_id = $1 ORDER BY date',
      [tripId]
    );

    return result.rows.map((row) => this.mapRowToItinerary(row));
  }

  async updateItineraryAdjustment(
    tripId: string,
    date: string,
    adjustment: DailyItinerary['adjustments'][0]
  ): Promise<void> {
    await this.pool.query(
      `UPDATE daily_itineraries
       SET adjustments = adjustments || $1::jsonb
       WHERE trip_id = $2 AND date = $3`,
      [JSON.stringify([adjustment]), tripId, date]
    );
  }

  // ============================================================================
  // AGENT DECISIONS
  // ============================================================================

  async saveAgentDecision(
    decision: Omit<AgentDecision, 'id'>
  ): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO agent_decisions
       (trip_id, date, agent_type, decision, rationale,
        input_signals, output_actions, timestamp, approval_required, approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        decision.tripId,
        decision.date,
        decision.agentType,
        decision.decision,
        decision.rationale,
        JSON.stringify(decision.inputSignals),
        JSON.stringify(decision.outputActions),
        decision.timestamp,
        decision.approvalRequired,
        decision.approved,
      ]
    );

    return result.rows[0].id;
  }

  async getAgentDecisions(tripId: string, date?: string): Promise<AgentDecision[]> {
    const query = date
      ? 'SELECT * FROM agent_decisions WHERE trip_id = $1 AND date = $2 ORDER BY timestamp'
      : 'SELECT * FROM agent_decisions WHERE trip_id = $1 ORDER BY timestamp';

    const params = date ? [tripId, date] : [tripId];
    const result = await this.pool.query(query, params);

    return result.rows.map((row) => this.mapRowToAgentDecision(row));
  }

  async approveDecision(
    decisionId: string,
    approvedBy: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE agent_decisions
       SET approved = true, approved_by = $1, approved_at = NOW()
       WHERE id = $2`,
      [approvedBy, decisionId]
    );
  }

  // ============================================================================
  // WELLNESS PROFILES
  // ============================================================================

  async saveWellnessProfile(profile: WellnessProfile): Promise<void> {
    await this.pool.query(
      `INSERT INTO wellness_profiles
       (user_id, who5_score, sleep_quality, energy_level, steps_target,
        dietary_restrictions, medical_conditions, mobility_level, medication_schedule)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id)
       DO UPDATE SET
         who5_score = EXCLUDED.who5_score,
         sleep_quality = EXCLUDED.sleep_quality,
         energy_level = EXCLUDED.energy_level,
         steps_target = EXCLUDED.steps_target,
         dietary_restrictions = EXCLUDED.dietary_restrictions,
         medical_conditions = EXCLUDED.medical_conditions,
         mobility_level = EXCLUDED.mobility_level,
         medication_schedule = EXCLUDED.medication_schedule,
         synced_at = NOW()`,
      [
        profile.userId,
        profile.who5Score,
        profile.sleepQuality,
        profile.energyLevel,
        profile.stepsTarget,
        profile.dietaryRestrictions,
        profile.medicalConditions,
        profile.mobilityLevel,
        JSON.stringify(profile.medicationSchedule),
      ]
    );
  }

  async getWellnessProfile(userId: string): Promise<WellnessProfile | null> {
    const result = await this.pool.query(
      'SELECT * FROM wellness_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWellnessProfile(result.rows[0]);
  }

  // ============================================================================
  // DAILY FEEDBACK
  // ============================================================================

  async saveDailyFeedback(feedback: Omit<DailyFeedback, 'id'>): Promise<void> {
    await this.pool.query(
      `INSERT INTO daily_feedback
       (trip_id, user_id, date, energy_rating, satisfaction_score, sleep_quality,
        physical_notes, emotional_notes, suggestions, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (trip_id, user_id, date)
       DO UPDATE SET
         energy_rating = EXCLUDED.energy_rating,
         satisfaction_score = EXCLUDED.satisfaction_score,
         sleep_quality = EXCLUDED.sleep_quality,
         physical_notes = EXCLUDED.physical_notes,
         emotional_notes = EXCLUDED.emotional_notes,
         suggestions = EXCLUDED.suggestions,
         timestamp = EXCLUDED.timestamp`,
      [
        feedback.tripId,
        feedback.userId,
        feedback.date,
        feedback.energyRating,
        feedback.satisfactionScore,
        feedback.sleepQuality,
        feedback.physicalNotes,
        feedback.emotionalNotes,
        feedback.suggestions,
        feedback.timestamp,
      ]
    );
  }

  async getDailyFeedback(
    tripId: string,
    date: string
  ): Promise<DailyFeedback | null> {
    const result = await this.pool.query(
      'SELECT * FROM daily_feedback WHERE trip_id = $1 AND date = $2',
      [tripId, date]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFeedback(result.rows[0]);
  }

  // ============================================================================
  // LAB ACTIVATIONS
  // ============================================================================

  async createLabActivation(activation: {
    userId: string;
    activationRoute: string;
    userOutcome: string;
    selectedImportance?: number;
    sessionData?: any;
  }): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO lab_activations
       (user_id, activation_route, user_outcome, selected_importance, session_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        activation.userId,
        activation.activationRoute,
        activation.userOutcome,
        activation.selectedImportance,
        JSON.stringify(activation.sessionData),
      ]
    );

    return result.rows[0].id;
  }

  async markLabLaunched(activationId: string): Promise<void> {
    await this.pool.query(
      'UPDATE lab_activations SET launched = true WHERE id = $1',
      [activationId]
    );
  }

  // ============================================================================
  // MCP SERVICE REGISTRY
  // ============================================================================

  async registerMCPService(service: {
    serviceName: string;
    serviceType: string;
    mcpUrl: string;
    capabilities: any;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO mcp_services
       (service_name, service_type, mcp_url, capabilities)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (service_name)
       DO UPDATE SET
         service_type = EXCLUDED.service_type,
         mcp_url = EXCLUDED.mcp_url,
         capabilities = EXCLUDED.capabilities,
         last_health_check = NOW()`,
      [service.serviceName, service.serviceType, service.mcpUrl, JSON.stringify(service.capabilities)]
    );
  }

  async getMCPServices(serviceType?: string): Promise<any[]> {
    const query = serviceType
      ? 'SELECT * FROM mcp_services WHERE service_type = $1 AND status = $2'
      : 'SELECT * FROM mcp_services WHERE status = $1';

    const params = serviceType ? [serviceType, 'active'] : ['active'];
    const result = await this.pool.query(query, params);

    return result.rows;
  }

  // ============================================================================
  // MAPPING FUNCTIONS
  // ============================================================================

  private mapRowToTrip(row: any): Trip {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      budget: {
        currency: row.budget_currency,
        total: parseFloat(row.budget_total),
        spent: parseFloat(row.budget_spent),
        categories: row.budget_categories,
      },
      travelers: [], // Would need to join with travelers table
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToItinerary(row: any): DailyItinerary {
    return {
      date: row.date,
      tripId: row.trip_id,
      location: row.location,
      energyLevel: row.energy_level,
      sleepQuality: row.sleep_quality,
      primaryIntent: row.primary_intent,
      schedule: row.schedule,
      health: row.health_data,
      spend: {
        planned: parseFloat(row.spend_planned),
        actual: parseFloat(row.spend_actual),
      },
      agentNotes: row.agent_notes,
      adjustments: row.adjustments || [],
    };
  }

  private mapRowToAgentDecision(row: any): AgentDecision {
    return {
      id: row.id,
      tripId: row.trip_id,
      date: row.date,
      agentType: row.agent_type,
      decision: row.decision,
      rationale: row.rationale,
      inputSignals: row.input_signals,
      outputActions: row.output_actions,
      timestamp: row.timestamp,
      approvalRequired: row.approval_required,
      approved: row.approved,
    };
  }

  private mapRowToWellnessProfile(row: any): WellnessProfile {
    return {
      userId: row.user_id,
      who5Score: row.who5_score,
      sleepQuality: row.sleep_quality,
      energyLevel: row.energy_level,
      stepsTarget: row.steps_target,
      dietaryRestrictions: row.dietary_restrictions,
      medicalConditions: row.medical_conditions,
      mobilityLevel: row.mobility_level,
      medicationSchedule: row.medication_schedule,
    };
  }

  private mapRowToFeedback(row: any): DailyFeedback {
    return {
      id: row.id,
      tripId: row.trip_id,
      userId: row.user_id,
      date: row.date,
      energyRating: row.energy_rating,
      satisfactionScore: row.satisfaction_score,
      sleepQuality: row.sleep_quality,
      physicalNotes: row.physical_notes,
      emotionalNotes: row.emotional_notes,
      suggestions: row.suggestions,
      timestamp: row.timestamp,
    };
  }
}
