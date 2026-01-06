/**
 * Example 3: Full Day Analysis (Multi-Agent)
 *
 * Shows how to run the complete Travel Experience Agent analysis
 * that coordinates all sub-agents.
 */

import { createSlowLuxuryClient } from '../src/client/slow-luxury-client';
import { Trip, DailyItinerary } from '../src/types/schema';

async function main() {
  console.log('=== Slow Luxury Travel: Full Day Analysis Example ===\n');

  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  console.log('✓ Connected to Slow Luxury Travel MCP server\n');

  // Trip context
  const trip: Trip = {
    id: 'trip_demo_vietnam',
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

  // Current day itinerary - Day 5 in Da Nang (second consecutive golf day)
  const currentItinerary: DailyItinerary = {
    date: '2026-02-20',
    tripId: 'trip_demo_vietnam',
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
    energyRating: 3, // Medium energy (1-5)
    sleepQuality: 3, // Moderate sleep
    satisfactionScore: 4, // Good satisfaction
    notes: 'Golf was great but felt tired in afternoon. Knee slightly sore.',
  };

  // Weather forecast
  const weather = {
    condition: 'partly cloudy',
    temperature: 34, // Hot!
    humidity: 78,
  };

  console.log('Analyzing Day 5 in Da Nang:');
  console.log(`  Date: ${currentItinerary.date}`);
  console.log(`  Location: ${currentItinerary.location}`);
  console.log(`  Primary Intent: ${currentItinerary.primaryIntent}`);
  console.log(`  Traveler Energy: ${travelerFeedback.energyRating}/5`);
  console.log(`  Sleep Quality: ${travelerFeedback.sleepQuality}/5`);
  console.log(`  Weather: ${weather.condition} (${weather.temperature}°C, ${weather.humidity}% humidity)`);
  console.log(`  Note: ${currentItinerary.agentNotes}`);
  console.log('');

  // Run full multi-agent analysis
  console.log('Running multi-agent analysis...\n');

  const recommendation = await client.analyzeDailyItinerary({
    tripId: trip.id,
    userId: trip.userId,
    date: currentItinerary.date,
    trip,
    currentItinerary,
    travelerFeedback,
    weather,
  });

  // Display results
  console.log('=== TRAVEL EXPERIENCE AGENT (TXA) RECOMMENDATION ===\n');
  console.log(`Decision: ${recommendation.decision}`);
  console.log(`Priority: ${recommendation.priority.toUpperCase()}`);
  console.log(`Approval Required: ${recommendation.approvalRequired ? 'YES' : 'NO'}`);
  console.log(`\nRationale:\n${recommendation.rationale}`);
  console.log(`\nRecommended Actions:`);
  recommendation.outputActions.forEach((action, i) => {
    if (action === '') {
      console.log('');
    } else {
      console.log(`  ${i + 1}. ${action}`);
    }
  });

  if (recommendation.approvalRequired) {
    console.log(`\n⚠️  HIGH PRIORITY: Traveler approval required before proceeding`);
  }

  console.log('\n=== ANALYSIS COMPLETE ===');

  // Disconnect
  await client.disconnect();
  console.log('\n✓ Disconnected');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
