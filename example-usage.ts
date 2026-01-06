/**
 * Example usage of the Slow Luxury Travel agents
 *
 * This file demonstrates how to use the Travel Experience Agent
 * to analyze a day's itinerary and get recommendations
 */

import { TravelExperienceAgent } from './src/agents/travel-experience-agent';
import { Trip, DailyItinerary, WellnessProfile } from './src/types/schema';

// Example wellness profile from CarePeers
const wellnessProfile: WellnessProfile = {
  userId: 'user_demo_001',
  who5Score: 68, // Medium well-being
  sleepQuality: 3, // Moderate sleep quality (1-5 scale)
  energyLevel: 'medium',
  stepsTarget: 7500,
  dietaryRestrictions: ['gluten-free'],
  medicalConditions: ['mild hypertension'],
  mobilityLevel: 'full',
  medicationSchedule: [
    {
      name: 'Lisinopril',
      frequency: 'daily',
      timing: 'morning',
    },
  ],
};

// Example trip
const trip: Trip = {
  id: 'trip_vietnam_japan_001',
  userId: 'user_demo_001',
  name: 'Vietnam Golf + Japan Culture - 38 Days',
  startDate: '2026-02-16T00:00:00Z',
  endDate: '2026-03-26T00:00:00Z',
  status: 'in_progress',
  budget: {
    currency: 'USD',
    total: 50000,
    spent: 12000,
    categories: {
      flights: 12000,
      hotels: 18000,
      golf: 5000,
      food: 8000,
      transport: 4000,
      guides: 2000,
      wellness: 1000,
    },
  },
  travelers: [
    {
      id: 'traveler_001',
      name: 'John Smith',
      email: 'john@example.com',
      wellnessProfileId: 'user_demo_001',
    },
  ],
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-02-20T08:00:00Z',
};

// Example daily itinerary - Day 5 in Da Nang (golf day)
const currentItinerary: DailyItinerary = {
  date: '2026-02-20',
  tripId: 'trip_vietnam_japan_001',
  location: 'Da Nang, Vietnam',
  energyLevel: 'medium',
  sleepQuality: 3,
  primaryIntent: 'golf',
  schedule: {
    morning: {
      activity: 'Golf at Montgomerie Links Vietnam',
      transport: 'Private car from hotel',
      startTime: '07:30',
      duration: 300, // 5 hours
    },
    midday: {
      activity: 'Lunch at clubhouse',
      restWindow: true,
    },
    afternoon: {
      activity: 'Spa treatment at Four Seasons',
      startTime: '15:00',
      duration: 90,
    },
    evening: {
      dining: 'Light Vietnamese dinner near hotel',
      notes: 'Early bedtime (9pm) for recovery',
    },
  },
  health: {
    stepsTarget: 8000,
    hydrationFocus: true,
    bodyNotes: 'Slight knee soreness from yesterday',
  },
  spend: {
    planned: 600,
    actual: 0,
  },
  agentNotes: 'Second consecutive golf day - monitor energy closely',
  adjustments: [],
};

// Traveler feedback from previous day
const travelerFeedback = {
  energyRating: 3, // Medium energy (1-5 scale)
  sleepQuality: 3, // Moderate sleep
  satisfactionScore: 4, // Good satisfaction
  notes: 'Golf was great but felt tired in afternoon. Knee slightly sore.',
};

// Weather forecast
const weather = {
  condition: 'partly cloudy',
  temperature: 34, // Celsius (hot!)
  humidity: 78,
};

// Budget status
const budgetStatus = {
  totalSpent: 12000,
  remainingBudget: 38000,
};

// Initialize Travel Experience Agent
const travelAgent = new TravelExperienceAgent();

async function analyzeDay() {
  console.log('\n=== SLOW LUXURY TRAVEL - AGENT ANALYSIS ===\n');
  console.log('Date:', currentItinerary.date);
  console.log('Location:', currentItinerary.location);
  console.log('Primary Intent:', currentItinerary.primaryIntent);
  console.log('Traveler Energy:', travelerFeedback.energyRating, '/5');
  console.log('Sleep Quality:', travelerFeedback.sleepQuality, '/5');
  console.log('Weather:', weather.condition, `(${weather.temperature}°C, ${weather.humidity}% humidity)`);
  console.log('\n');

  try {
    // Run TXA analysis
    const recommendation = await travelAgent.analyze({
      tripId: trip.id,
      userId: trip.userId,
      date: currentItinerary.date,
      trip,
      wellnessProfile,
      currentItinerary,
      travelerFeedback,
      weather,
      budgetStatus,
    });

    console.log('=== AGENT RECOMMENDATION ===\n');
    console.log('Decision:', recommendation.decision);
    console.log('Priority:', recommendation.priority);
    console.log('Requires Approval:', recommendation.approvalRequired);
    console.log('\nRationale:');
    console.log(recommendation.rationale);
    console.log('\nRecommended Actions:');
    recommendation.outputActions.forEach((action, i) => {
      if (action === '') {
        console.log('');
      } else {
        console.log(`  ${i + 1}. ${action}`);
      }
    });

    console.log('\n=== END ANALYSIS ===\n');

    return recommendation;
  } catch (error) {
    console.error('Error during analysis:', error);
    throw error;
  }
}

// Run the example
analyzeDay()
  .then(() => {
    console.log('✓ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Analysis failed:', error);
    process.exit(1);
  });

/**
 * EXPECTED OUTPUT:
 *
 * Based on the context:
 * - Second consecutive golf day
 * - Energy level 3/5 (medium)
 * - Sleep quality 3/5 (moderate)
 * - Hot weather (34°C, 78% humidity)
 * - Knee soreness noted
 *
 * The Health & Recovery Agent should flag concerns about:
 * - Back-to-back golf days with medium energy
 * - Hot weather increasing physical stress
 * - Knee soreness requiring attention
 *
 * Likely recommendation:
 * - Skip golf or substitute to Ba Na Hills (cooler mountain course)
 * - Reduce physical load
 * - Prioritize recovery
 *
 * This demonstrates the agent's ability to:
 * 1. Consider multiple signals (health, weather, consecutive activities)
 * 2. Apply decision rules from the itinerary spec
 * 3. Prioritize traveler well-being over sticking to plan
 */
