/**
 * Example 2: Golf Operations Planning
 *
 * Shows how to optimize golf course selection based on
 * weather, energy levels, and course availability.
 */

import { createSlowLuxuryClient } from '../src/client/slow-luxury-client';

async function main() {
  console.log('=== Slow Luxury Travel: Golf Planning Example ===\n');

  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  console.log('✓ Connected to Slow Luxury Travel MCP server\n');

  // Scenario: Planning golf in Da Nang with hot weather
  const scenario = {
    userId: 'user_demo_001',
    date: '2026-02-21',
    location: 'Da Nang, Vietnam',
    energyLevel: 4, // Good energy
    consecutiveGolfDays: 0, // No recent golf
    weatherForecast: {
      condition: 'sunny',
      temperature: 34, // Hot!
      humidity: 78,
      rainfall: 0,
    },
    availableCourses: [
      {
        name: 'Montgomerie Links Vietnam',
        travelTime: 20,
        difficulty: 'moderate' as const,
        climate: 'hot' as const,
      },
      {
        name: 'Ba Na Hills Golf Club',
        travelTime: 60,
        difficulty: 'challenging' as const,
        climate: 'mountain' as const, // Cooler!
      },
      {
        name: 'Laguna Lang Co Golf Club',
        travelTime: 45,
        difficulty: 'moderate' as const,
        climate: 'hot' as const,
      },
    ],
  };

  console.log('Planning golf round:');
  console.log(`  Location: ${scenario.location}`);
  console.log(`  Energy Level: ${scenario.energyLevel}/5`);
  console.log(`  Weather: ${scenario.weatherForecast.condition}, ${scenario.weatherForecast.temperature}°C, ${scenario.weatherForecast.humidity}% humidity`);
  console.log(`  Available Courses: ${scenario.availableCourses.length}`);
  console.log('');

  // Get golf recommendation
  const recommendation = await client.getGolfOperationsPlanning(scenario);

  // Display results
  console.log('=== GOLF OPERATIONS RECOMMENDATION ===\n');
  console.log(`Decision: ${recommendation.decision}`);
  console.log(`Priority: ${recommendation.priority.toUpperCase()}`);
  console.log(`\nRationale:\n${recommendation.rationale}`);
  console.log(`\nRecommended Actions:`);
  recommendation.outputActions.forEach((action, i) => {
    if (action === '') {
      console.log('');
    } else {
      console.log(`  ${i + 1}. ${action}`);
    }
  });

  // Disconnect
  await client.disconnect();
  console.log('\n✓ Disconnected');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
