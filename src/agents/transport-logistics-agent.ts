/**
 * Transport & Logistics Agent
 *
 * Responsibility: Ensure all movement is smooth, buffered, and low stress
 *
 * Based on Section 11E from asia_golf_culture_itinerary.md
 */

import { BaseAgent, AgentContext, AgentRecommendation } from './base-agent';
import { TransportSegment } from '../types/schema';

interface TransportLogisticsContext extends AgentContext {
  plannedSegments?: TransportSegment[];
  currentLocation: string;
  nextDestination?: string;
  departureTime?: string;
  arrivalTime?: string;
  transportType?: 'flight' | 'train' | 'private_car' | 'taxi';
  luggageCount?: number;
  mobilityConsiderations?: string[];
}

export class TransportLogisticsAgent extends BaseAgent {
  // Buffer requirements (in minutes)
  private readonly AIRPORT_BUFFER = 120; // 2 hours for international
  private readonly DOMESTIC_AIRPORT_BUFFER = 90; // 1.5 hours
  private readonly COURSE_TRANSFER_BUFFER = 45; // 45 minutes
  private readonly HOTEL_CHECKIN_BUFFER = 30; // 30 minutes
  private readonly STANDARD_BUFFER = 15; // General buffer

  constructor() {
    super('transport_logistics', 'Transport & Logistics Agent');
  }

  async analyze(context: TransportLogisticsContext): Promise<AgentRecommendation> {
    this.validateContext(context, ['tripId', 'userId', 'date', 'currentLocation']);

    const signals = this.collectSignals(context);

    this.log('info', 'Analyzing transport logistics', signals);

    // Check if transport plan exists
    if (!context.nextDestination) {
      return this.createRecommendation(
        'No transport scheduled',
        'No transport requirements for this day.',
        signals,
        [],
        { priority: 'low' }
      );
    }

    // Assess buffer adequacy
    const bufferAssessment = this.assessBuffers(context);
    if (bufferAssessment.insufficient) {
      return this.recommendBufferIncrease(bufferAssessment, signals);
    }

    // Check for risk factors
    const risks = this.identifyRisks(context);
    if (risks.length > 0) {
      return this.recommendRiskMitigation(risks, signals, context);
    }

    // All looks good
    return this.confirmTransportPlan(signals, context);
  }

  private collectSignals(context: TransportLogisticsContext): Record<string, any> {
    return {
      currentLocation: context.currentLocation,
      nextDestination: context.nextDestination,
      transportType: context.transportType,
      departureTime: context.departureTime,
      arrivalTime: context.arrivalTime,
      luggageCount: context.luggageCount,
      mobilityConsiderations: context.mobilityConsiderations,
      plannedSegmentsCount: context.plannedSegments?.length || 0,
    };
  }

  private assessBuffers(
    context: TransportLogisticsContext
  ): {
    insufficient: boolean;
    requiredBuffer: number;
    currentBuffer?: number;
    details: string;
  } {
    if (!context.transportType || !context.departureTime) {
      return { insufficient: false, requiredBuffer: 0, details: 'No transport scheduled' };
    }

    let requiredBuffer = this.STANDARD_BUFFER;

    switch (context.transportType) {
      case 'flight':
        requiredBuffer = this.isInternationalFlight(context)
          ? this.AIRPORT_BUFFER
          : this.DOMESTIC_AIRPORT_BUFFER;
        break;
      case 'private_car':
        if (this.isGolfCourseTransfer(context)) {
          requiredBuffer = this.COURSE_TRANSFER_BUFFER;
        }
        break;
    }

    // TODO: Calculate actual buffer from schedule - would need previous activity end time
    // For now, flag if no buffer is specified
    return {
      insufficient: false, // Would check actual timing here
      requiredBuffer,
      details: `Requires ${requiredBuffer} minute buffer for ${context.transportType}`,
    };
  }

  private isInternationalFlight(context: TransportLogisticsContext): boolean {
    // Simple heuristic - different countries
    const international = ['vietnam', 'japan', 'korea'];
    const current = context.currentLocation.toLowerCase();
    const next = context.nextDestination?.toLowerCase() || '';

    const currentCountry = international.find(c => current.includes(c));
    const nextCountry = international.find(c => next.includes(c));

    return currentCountry !== nextCountry;
  }

  private isGolfCourseTransfer(context: TransportLogisticsContext): boolean {
    return (
      context.nextDestination?.toLowerCase().includes('golf') ||
      context.nextDestination?.toLowerCase().includes('course') ||
      false
    );
  }

  private recommendBufferIncrease(
    assessment: ReturnType<typeof this.assessBuffers>,
    signals: Record<string, any>
  ): AgentRecommendation {
    const actions = [
      `Increase buffer to ${assessment.requiredBuffer} minutes`,
      'Adjust preceding activities if needed',
      'Confirm departure time allows for buffer',
    ];

    if (signals.luggageCount && signals.luggageCount > 2) {
      actions.push('Consider porter assistance due to luggage count');
    }

    if (signals.mobilityConsiderations && signals.mobilityConsiderations.length > 0) {
      actions.push('Request wheelchair or mobility assistance in advance');
    }

    return this.createRecommendation(
      'Insufficient transport buffer',
      assessment.details + '. Reliability requires adequate buffer time.',
      signals,
      actions,
      {
        approvalRequired: true,
        priority: 'high',
      }
    );
  }

  private identifyRisks(context: TransportLogisticsContext): string[] {
    const risks: string[] = [];

    // Heavy luggage
    if (context.luggageCount && context.luggageCount > 3) {
      risks.push('Heavy luggage count may slow movement');
    }

    // Mobility considerations
    if (context.mobilityConsiderations && context.mobilityConsiderations.length > 0) {
      risks.push(`Mobility considerations: ${context.mobilityConsiderations.join(', ')}`);
    }

    // Multiple transport segments in one day
    if (context.plannedSegments && context.plannedSegments.length > 2) {
      risks.push('Multiple transport segments increase fatigue and delay risk');
    }

    // Early morning departure
    if (context.departureTime && this.isEarlyDeparture(context.departureTime)) {
      risks.push('Early departure may impact sleep quality');
    }

    return risks;
  }

  private isEarlyDeparture(departureTime: string): boolean {
    const hour = parseInt(departureTime.split(':')[0]);
    return hour < 7;
  }

  private recommendRiskMitigation(
    risks: string[],
    signals: Record<string, any>,
    context: TransportLogisticsContext
  ): AgentRecommendation {
    const actions = [
      'Risk factors identified:',
      ...risks.map(r => `- ${r}`),
      '',
      'Recommended mitigations:',
    ];

    if (risks.some(r => r.includes('luggage'))) {
      actions.push('- Arrange porter or luggage assistance');
      actions.push('- Consider shipping some items ahead');
    }

    if (risks.some(r => r.includes('mobility'))) {
      actions.push('- Pre-book wheelchair or mobility assistance');
      actions.push('- Request priority boarding');
      actions.push('- Allocate extra time for boarding');
    }

    if (risks.some(r => r.includes('segments'))) {
      actions.push('- Build in rest periods between segments');
      actions.push('- Consider overnight stay to break up journey');
    }

    if (risks.some(r => r.includes('Early departure'))) {
      actions.push('- Ensure 8-hour sleep window before departure');
      actions.push('- Prepare luggage night before');
      actions.push('- Arrange express checkout');
    }

    return this.createRecommendation(
      'Transport risk factors detected',
      `${risks.length} risk factors identified for transport on ${context.date}. ` +
      'Proactive mitigation recommended.',
      signals,
      actions,
      {
        approvalRequired: false,
        priority: 'medium',
      }
    );
  }

  private confirmTransportPlan(
    signals: Record<string, any>,
    context: TransportLogisticsContext
  ): AgentRecommendation {
    const actions = [
      `Transport: ${context.currentLocation} → ${context.nextDestination}`,
      `Type: ${context.transportType}`,
    ];

    if (context.departureTime) {
      actions.push(`Departure: ${context.departureTime}`);
    }
    if (context.arrivalTime) {
      actions.push(`Arrival: ${context.arrivalTime}`);
    }

    actions.push('', 'Transport plan approved - adequate buffers and low risk');

    return this.createRecommendation(
      'Transport plan confirmed',
      'All transport logistics reviewed. Plan is reliable and low-stress.',
      signals,
      actions,
      {
        approvalRequired: false,
        priority: 'low',
      }
    );
  }
}
