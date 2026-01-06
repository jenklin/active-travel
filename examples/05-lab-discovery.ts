/**
 * Example 5: Lab Discovery & Capabilities
 *
 * Shows how to programmatically discover what the lab offers
 * and what agents are available.
 */

import { createSlowLuxuryClient } from '../src/client/slow-luxury-client';

async function main() {
  console.log('=== Slow Luxury Travel: Lab Discovery Example ===\n');

  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  console.log('✓ Connected to Slow Luxury Travel MCP server\n');

  // Get lab information
  console.log('Fetching lab information...\n');
  const labInfo = await client.getLabInfo();

  console.log('=== LAB INFORMATION ===\n');
  console.log(`Name: ${labInfo.name}`);
  console.log(`Lab ID: ${labInfo.labId}`);
  console.log(`Category: ${labInfo.category}`);
  console.log(`Target Audience: ${labInfo.targetAudience}`);
  console.log(`Service Type: ${labInfo.serviceType}`);
  console.log(`Status: ${labInfo.status}`);
  console.log(`Version: ${labInfo.version}`);
  console.log('');

  console.log('Description:');
  console.log(`  ${labInfo.description}`);
  console.log('');

  console.log('Capabilities:');
  labInfo.capabilities.forEach((cap: string, i: number) => {
    console.log(`  ${i + 1}. ${cap}`);
  });
  console.log('');

  console.log('Integrations:');
  labInfo.integrations.forEach((integration: string, i: number) => {
    console.log(`  ${i + 1}. ${integration}`);
  });
  console.log('');

  console.log('Pricing:');
  console.log(`  Model: ${labInfo.pricing.model}`);
  labInfo.pricing.tiers.forEach((tier: any) => {
    console.log(`  - ${tier.name}: $${tier.basePrice} ${tier.currency}`);
    console.log(`    ${tier.description}`);
  });
  console.log('');

  // Get detailed capabilities
  console.log('Fetching detailed agent capabilities...\n');
  const capabilities = await client.getLabCapabilities();

  console.log('=== AGENT DETAILS ===\n');
  capabilities.agents.forEach((agent: any, i: number) => {
    console.log(`${i + 1}. ${agent.name} (${agent.role})`);
    console.log(`   ${agent.description}`);
    if (agent.mcpTools) {
      console.log(`   MCP Tools: ${agent.mcpTools.join(', ')}`);
    }
    if (agent.rules) {
      console.log(`   Rules:`);
      agent.rules.forEach((rule: string) => {
        console.log(`     - ${rule}`);
      });
    }
    console.log('');
  });

  // List available tools
  console.log('=== AVAILABLE MCP TOOLS ===\n');
  const tools = await client.listTools();
  tools.forEach((tool: any, i: number) => {
    console.log(`${i + 1}. ${tool.name}`);
    console.log(`   ${tool.description}`);
    console.log('');
  });

  // List available resources
  console.log('=== AVAILABLE MCP RESOURCES ===\n');
  const resources = await client.listResources();
  resources.forEach((resource: any, i: number) => {
    console.log(`${i + 1}. ${resource.name}`);
    console.log(`   URI: ${resource.uri}`);
    console.log(`   ${resource.description}`);
    console.log('');
  });

  // Disconnect
  await client.disconnect();
  console.log('✓ Disconnected');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
