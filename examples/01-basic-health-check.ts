/**
 * Example 1: Basic Health & Recovery Check
 *
 * Shows how to use the Health Recovery Agent programmatically
 * to determine if a traveler should rest or continue activities.
 */

import { createSlowLuxuryClient } from '../src/client/slow-luxury-client';

async function main() {
  console.log('=== Slow Luxury Travel: Health Check Example ===\n');

  // Create and connect client
  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  console.log('✓ Connected to Slow Luxury Travel MCP server\n');

  // Scenario: Traveler in Da Nang, day 5 of trip
  const scenario = {
    userId: 'user_demo_001',
    date: '2026-02-20',
    sleepQuality: 3, // Moderate sleep (1-5 scale)
    energyRating: 3, // Medium energy (1-5 scale)
    consecutiveActiveDays: 4, // 4 days without rest
    plannedActivity: {
      type: 'golf',
      physicalLoad: 'high' as const,
      estimatedSteps: 10000,
    },
  };

  console.log('Analyzing health status:');
  console.log(`  Sleep Quality: ${scenario.sleepQuality}/5`);
  console.log(`  Energy Level: ${scenario.energyRating}/5`);
  console.log(`  Consecutive Active Days: ${scenario.consecutiveActiveDays}`);
  console.log(`  Planned Activity: ${scenario.plannedActivity.type} (${scenario.plannedActivity.physicalLoad} load)`);
  console.log('');

  // Get health recommendation
  const recommendation = await client.getHealthRecoveryAnalysis(scenario);

  // Display results
  console.log('=== HEALTH AGENT RECOMMENDATION ===\n');
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

  if (recommendation.approvalRequired) {
    console.log(`\n⚠️  APPROVAL REQUIRED - High priority recommendation`);
  }

  // Disconnect
  await client.disconnect();
  console.log('\n✓ Disconnected');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
