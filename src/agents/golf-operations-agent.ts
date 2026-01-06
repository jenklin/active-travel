/**
 * Vietnam Golf Operations Agent
 *
 * Responsibility: Optimize golf experiences in Da Nang / Hoi An, Vietnam
 *
 * Based on Section 11B from asia_golf_culture_itinerary.md
 */

import { BaseAgent, AgentContext, AgentRecommendation } from './base-agent';
import { GolfRound } from '../types/schema';

interface GolfOperationsContext extends AgentContext {
  location: string;
  recentRounds?: GolfRound[];
  energyLevel?: number; // 1-5
  weatherForecast?: {
    condition: string;
    temperature: number;
    humidity: number;
    rainfall?: number;
  };
  consecutiveGolfDays: number;
  availableCourses: {
    name: string;
    travelTime: number; // minutes
    difficulty: 'easy' | 'moderate' | 'challenging';
    climate: 'hot' | 'cool' | 'mountain';
  }[];
}

export class GolfOperationsAgent extends BaseAgent {
  // Course preferences for repeat play
  private readonly PREFERRED_REPEAT_COURSES = [
    'Ba Na Hills Golf Club',
    'Montgomerie Links Vietnam'
  ];

  constructor() {
    super('golf_operations', 'Vietnam Golf Operations Agent');
  }

  async analyze(context: GolfOperationsContext): Promise<AgentRecommendation> {
    this.validateContext(context, ['tripId', 'userId', 'date', 'location']);

    // Golf is only played in Vietnam
    if (!this.isVietnamLocation(context.location)) {
      return this.createRecommendation(
        'No golf operations - outside Vietnam',
        'Golf activities are only scheduled in Da Nang / Hoi An, Vietnam.',
        { location: context.location },
        [],
        { priority: 'low' }
      );
    }

    const signals = this.collectSignals(context);

    this.log('info', 'Analyzing golf operations', signals);

    // Decision rules
    if (this.shouldSkipGolf(signals)) {
      return this.recommendSkipGolf(signals);
    }

    if (this.shouldSubstituteCourse(signals, context)) {
      return this.recommendCourseSubstitution(signals, context);
    }

    return this.recommendOptimalCourse(signals, context);
  }

  private isVietnamLocation(location: string): boolean {
    const vietnamCities = ['hanoi', 'da nang', 'hoi an', 'ho chi minh', 'saigon'];
    return vietnamCities.some(city =>
      location.toLowerCase().includes(city)
    );
  }

  private collectSignals(context: GolfOperationsContext): Record<string, any> {
    return {
      consecutiveGolfDays: context.consecutiveGolfDays,
      energyLevel: context.energyLevel,
      weather: context.weatherForecast,
      recentRounds: context.recentRounds?.length || 0,
      location: context.location,
    };
  }

  /**
   * Rule: Never schedule more than 3 rounds in a 7-day period unless explicitly requested
   * Rule: Avoid back-to-back rounds if prior-day energy < 4/5
   */
  private shouldSkipGolf(signals: Record<string, any>): boolean {
    // Back-to-back rounds with low energy
    if (signals.consecutiveGolfDays >= 1 && signals.energyLevel && signals.energyLevel < 4) {
      return true;
    }

    // Too many consecutive golf days
    if (signals.consecutiveGolfDays >= 2) {
      return true;
    }

    return false;
  }

  private recommendSkipGolf(signals: Record<string, any>): AgentRecommendation {
    let rationale = '';
    const actions = ['Cancel planned golf round', 'Insert recovery day'];

    if (signals.consecutiveGolfDays >= 2) {
      rationale = `${signals.consecutiveGolfDays} consecutive golf days exceeds safe physical load. ` +
        'Recovery day needed to prevent joint strain and fatigue.';
      actions.push('Schedule spa or massage treatment');
    } else if (signals.energyLevel && signals.energyLevel < 4) {
      rationale = `Energy level ${signals.energyLevel}/5 is too low for golf after playing yesterday. ` +
        'Risk of poor performance and reduced enjoyment.';
      actions.push('Consider practice range or short game only (optional)');
    }

    return this.createRecommendation(
      'Skip golf - force recovery day',
      rationale,
      signals,
      actions,
      {
        approvalRequired: true,
        priority: 'high',
      }
    );
  }

  /**
   * Weather-based course substitution
   */
  private shouldSubstituteCourse(
    signals: Record<string, any>,
    context: GolfOperationsContext
  ): boolean {
    if (!signals.weather) return false;

    const weather = signals.weather;

    // Heavy rain
    if (weather.rainfall && weather.rainfall > 10) {
      return true;
    }

    // High heat
    if (weather.temperature > 35 || (weather.temperature > 32 && weather.humidity > 80)) {
      return true;
    }

    return false;
  }

  private recommendCourseSubstitution(
    signals: Record<string, any>,
    context: GolfOperationsContext
  ): AgentRecommendation {
    const weather = signals.weather;
    let substitution = '';
    const actions = [];

    if (weather.rainfall && weather.rainfall > 10) {
      actions.push('Convert to spa day or cultural activity');
      actions.push('Reschedule golf to later in week');
      substitution = 'Heavy rain forecast - course conditions will be poor';
    } else if (weather.temperature > 35) {
      // Prefer cooler mountain course
      const baNaHills = context.availableCourses.find(c =>
        c.name.includes('Ba Na Hills')
      );
      if (baNaHills) {
        actions.push(`Substitute to ${baNaHills.name} (cooler mountain climate)`);
        actions.push('Earlier tee time (before 8am)');
        substitution = `High heat forecast (${weather.temperature}°C) - mountain course preferred`;
      } else {
        actions.push('Very early tee time (before 7am)');
        actions.push('Extended midpoint break for hydration');
        substitution = `High heat forecast (${weather.temperature}°C) - adjust timing`;
      }
    }

    return this.createRecommendation(
      'Substitute golf course due to weather',
      substitution,
      signals,
      actions,
      {
        approvalRequired: true,
        priority: 'high',
      }
    );
  }

  /**
   * Recommend optimal course based on conditions
   */
  private recommendOptimalCourse(
    signals: Record<string, any>,
    context: GolfOperationsContext
  ): AgentRecommendation {
    const availableCourses = context.availableCourses || [];

    if (availableCourses.length === 0) {
      return this.createRecommendation(
        'No course recommendation - insufficient data',
        'No available courses provided in context.',
        signals,
        [],
        { priority: 'low' }
      );
    }

    // Prefer Ba Na Hills or Montgomerie Links for repeat play
    let recommendedCourse = availableCourses.find(c =>
      this.PREFERRED_REPEAT_COURSES.some(pref => c.name.includes(pref))
    );

    // If none available, choose based on travel time and energy
    if (!recommendedCourse) {
      recommendedCourse = this.selectByTravelTime(availableCourses, signals.energyLevel);
    }

    const actions = [
      `Book tee time at ${recommendedCourse!.name}`,
      'Morning tee time only (before 10am)',
      'Confirm caddie and cart included',
      `Travel time: ${recommendedCourse!.travelTime} minutes`
    ];

    return this.createRecommendation(
      `Proceed with golf at ${recommendedCourse!.name}`,
      this.buildCourseRationale(recommendedCourse!, signals),
      signals,
      actions,
      {
        approvalRequired: false,
        priority: 'medium',
      }
    );
  }

  private selectByTravelTime(
    courses: GolfOperationsContext['availableCourses'],
    energyLevel?: number
  ) {
    // Low energy = prefer shorter travel
    if (energyLevel && energyLevel < 4) {
      return courses.reduce((closest, course) =>
        course.travelTime < closest.travelTime ? course : closest
      );
    }

    // Otherwise balance travel time and quality
    return courses[0];
  }

  private buildCourseRationale(
    course: GolfOperationsContext['availableCourses'][0],
    signals: Record<string, any>
  ): string {
    const reasons = [];

    if (this.PREFERRED_REPEAT_COURSES.some(pref => course.name.includes(pref))) {
      reasons.push('preferred course for repeat play');
    }

    if (course.climate === 'cool' || course.climate === 'mountain') {
      reasons.push('cooler climate reduces physical stress');
    }

    if (course.travelTime < 30) {
      reasons.push('minimal travel time preserves energy');
    }

    if (signals.energyLevel && signals.energyLevel >= 4) {
      reasons.push(`energy level ${signals.energyLevel}/5 supports full round`);
    }

    return reasons.length > 0
      ? `Selected based on: ${reasons.join(', ')}.`
      : 'Course selected based on availability and schedule.';
  }
}
