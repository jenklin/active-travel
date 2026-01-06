/**
 * Example 4: Create a New Trip
 *
 * Shows how to programmatically create a trip with
 * budget allocation and traveler details.
 */

import { createSlowLuxuryClient } from '../src/client/slow-luxury-client';

async function main() {
  console.log('=== Slow Luxury Travel: Trip Creation Example ===\n');

  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  console.log('✓ Connected to Slow Luxury Travel MCP server\n');

  // Define new trip
  const newTrip = {
    userId: 'user_demo_001',
    name: 'Southeast Asia Golf & Culture - 4 Weeks',
    startDate: '2026-03-01T00:00:00Z',
    endDate: '2026-03-28T00:00:00Z',
    budget: {
      total: 45000,
      categories: {
        flights: 10000,
        hotels: 15000,
        golf: 6000,
        food: 7000,
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
      {
        id: 'traveler_002',
        name: 'Jane Smith',
        email: 'jane@example.com',
        wellnessProfileId: 'user_demo_002',
      },
    ],
  };

  console.log('Creating new trip:');
  console.log(`  Name: ${newTrip.name}`);
  console.log(`  Dates: ${newTrip.startDate.split('T')[0]} to ${newTrip.endDate.split('T')[0]}`);
  console.log(`  Budget: $${newTrip.budget.total.toLocaleString()}`);
  console.log(`  Travelers: ${newTrip.travelers.length}`);
  console.log('');

  // Create trip
  const result = await client.createTrip(newTrip);

  // Display results
  console.log('=== TRIP CREATED ===\n');
  console.log(`Success: ${result.success}`);
  console.log(`Message: ${result.message}`);
  console.log(`Trip ID: ${result.trip.id}`);
  console.log('');

  console.log('Budget Breakdown:');
  Object.entries(newTrip.budget.categories).forEach(([category, amount]) => {
    const percentage = ((amount / newTrip.budget.total) * 100).toFixed(1);
    console.log(`  ${category.padEnd(15)} $${amount.toLocaleString().padStart(7)} (${percentage}%)`);
  });

  console.log('');
  console.log('Travelers:');
  newTrip.travelers.forEach((traveler, i) => {
    console.log(`  ${i + 1}. ${traveler.name} (${traveler.email})`);
    if (traveler.wellnessProfileId) {
      console.log(`     Wellness Profile: ${traveler.wellnessProfileId}`);
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
