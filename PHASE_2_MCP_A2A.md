## Phase 2: MCP/A2A Architecture - Complete

**Status**: ✅ READY FOR INTEGRATION TESTING

This document describes the Model Context Protocol (MCP) and Agent-to-Agent (A2A) architecture implemented in Phase 2.

---

## Overview

Slow Luxury Travel is now a **fully-registered Experience Lab** with:
- ✅ MCP Server exposing agents as tools
- ✅ A2A Bridge for communicating with CarePeers
- ✅ Lab Registry for platform discovery
- ✅ Database persistence layer
- ✅ Service discovery system

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  CloudPeers Platform (Aggregator)                            │
│  - Discovers available Experience Labs                       │
│  - Routes users to appropriate labs                          │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ User selects "multi-week trip" outcome
             ↓
┌──────────────────────────────────────────────────────────────┐
│  Slow Luxury Travel (Experience Lab)                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  MCP Server (stdio transport)                           │ │
│  │  - Exposes 7 tools (agents as MCP tools)               │ │
│  │  - Provides 6 resources (trip data, lab info)          │ │
│  │  - Lab registry manifest                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  A2A Bridge                                             │ │
│  │  - Connects to CarePeers MCP                           │ │
│  │  - Fetches wellness profiles                           │ │
│  │  - Updates wellness logs                               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Travel Agents                                          │ │
│  │  - TXA (orchestrator)                                   │ │
│  │  - Health Recovery                                      │ │
│  │  - Golf Operations                                      │ │
│  │  - Budget Control                                       │ │
│  │  - Transport Logistics                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                                    │ │
│  │  - Trips, itineraries, activities                      │ │
│  │  - Agent decisions (audit trail)                       │ │
│  │  - Wellness profiles (cached)                          │ │
│  │  - Lab activations                                     │ │
│  │  - MCP service registry                                │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────┬──────────────────────────────────────────────────┘
             │
             │ A2A Communication (MCP)
             ↓
┌──────────────────────────────────────────────────────────────┐
│  CarePeers Experience Lab (Wellness Service)                 │
│  - Provides wellness profiles via MCP                        │
│  - Receives activity logs via MCP                            │
│  - Provides activity recommendations                         │
└──────────────────────────────────────────────────────────────┘
```

---

## MCP Server Implementation

### Location
`src/mcp/server.ts`

### Exposed Tools (7)

All travel agents are exposed as MCP tools that can be called by:
- Other AI agents
- Claude Desktop
- MCP-compatible clients

#### 1. `analyze_daily_itinerary`
Main orchestration tool that runs all sub-agents.

**Input**: Trip context, itinerary, feedback, weather
**Output**: Multi-agent recommendation with priority and actions

#### 2. `health_recovery_analysis`
Specialized health monitoring and rest day recommendations.

**Input**: Sleep quality, energy, consecutive active days
**Output**: Recovery recommendations, activity substitutions

#### 3. `golf_operations_planning`
Vietnam-specific golf course optimization.

**Input**: Location, energy, weather, available courses
**Output**: Course selection, tee time, weather substitutions

#### 4. `budget_control_check`
Budget monitoring and reallocation recommendations.

**Input**: Trip budget, category spending
**Output**: Variance alerts, reallocation suggestions

#### 5. `transport_logistics_review`
Transport reliability and risk mitigation.

**Input**: Current location, next destination, transport type
**Output**: Buffer validation, risk factors, mitigations

#### 6. `create_trip`
Initialize a new trip with wellness integration.

**Input**: Trip details, travelers, budget
**Output**: Created trip with wellness profiles fetched

#### 7. `get_wellness_constraints`
Fetch wellness profile from CarePeers.

**Input**: userId
**Output**: Wellness constraints for activity planning

### Exposed Resources (6)

Resources allow MCP clients to read travel data.

#### 1. `slt://trips`
List all trips managed by the service.

#### 2. `slt://trips/{tripId}`
Detailed trip information.

#### 3. `slt://trips/{tripId}/itinerary`
Daily itinerary for a trip.

#### 4. `slt://trips/{tripId}/decisions`
Audit log of all agent decisions.

#### 5. `slt://lab/info`
Experience Lab metadata for discovery.

**Example response**:
```json
{
  "labId": "slow-luxury-travel",
  "name": "Slow Luxury Travel Experience Lab",
  "category": "travel_wellness",
  "targetAudience": "50-65 year old professionals",
  "serviceType": "human_in_loop_ai_agents",
  "capabilities": [
    "Multi-agent trip planning",
    "Health-aware activity scheduling",
    "Golf operations optimization (Vietnam)",
    ...
  ],
  "integrations": ["carepeers_wellness_profile"],
  "pricing": { ... },
  "status": "beta",
  "version": "0.1.0"
}
```

#### 6. `slt://lab/capabilities`
Detailed agent specifications and capabilities.

### Running the MCP Server

```bash
# Development
npm run dev:mcp

# Production
npm run build
npm run start:mcp
```

The server runs on **stdio transport** and communicates via stdin/stdout.

### Connecting from Claude Desktop

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "slow-luxury-travel": {
      "command": "node",
      "args": ["/path/to/slow-luxury-travel/dist/mcp/server.js"]
    }
  }
}
```

---

## A2A Communication

### Location
`src/mcp/a2a-bridge.ts`

### Components

#### 1. **A2ABridge**
Core MCP client that connects to external services.

Methods:
- `connectToService(config)` - Connect to an MCP service
- `listTools(serviceName)` - List available tools
- `callTool(serviceName, toolName, args)` - Invoke a tool
- `readResource(serviceName, uri)` - Read a resource

#### 2. **CarepeersA2AClient**
CarePeers-specific wrapper with domain methods.

Methods:
- `getWellnessProfile(userId)` - Fetch wellness data
- `updateWellnessLog(userId, date, data)` - Send activity logs
- `getActivityRecommendations(userId, activityType)` - Get recommendations

#### 3. **ServiceDiscoveryRegistry**
Discovers and registers available MCP services.

Methods:
- `registerService(config)` - Add a known service
- `getServiceConfig(name)` - Get connection details
- `findServicesByType(type)` - Find wellness services, booking services, etc.

#### 4. **A2AManager**
Singleton that manages all A2A connections.

Usage:
```typescript
import { A2AManager } from './mcp/a2a-bridge';

const manager = A2AManager.getInstance();
await manager.initialize(); // Connects to all configured services

const carepeersClient = manager.getCarePeersClient();
const wellnessProfile = await carepeersClient.getWellnessProfile('user_123');
```

### Configuration

Set environment variables to enable CarePeers connection:

```bash
# .env
CAREPEERS_MCP_COMMAND=node
CAREPEERS_MCP_ARGS=/path/to/carepeers/dist/mcp/server.js
CAREPEERS_API_KEY=your_api_key_here
```

The A2A Manager will automatically discover and connect on startup.

---

## Database Schema

### Location
`src/database/schema.sql`

### Tables (14 total)

**Core Tables**:
- `trips` - Trip metadata, budget, dates
- `travelers` - Trip participants with wellness profile links
- `daily_itineraries` - Day-by-day schedules
- `activities` - Individual activities (golf, culture, dining, etc.)
- `golf_rounds` - Specialized golf activity details
- `transport_segments` - Flights, trains, private cars
- `accommodations` - Hotel bookings

**Wellness Integration**:
- `wellness_profiles` - Cached from CarePeers
- `daily_feedback` - Traveler check-ins (energy, sleep, satisfaction)
- `travel_preferences` - User preferences and constraints

**Agent System**:
- `agent_decisions` - Audit trail of all agent recommendations
- `lab_activations` - Lab onboarding sessions
- `mcp_services` - Registry of connected MCP services

**Views**:
- `active_trips_summary` - Budget and activity rollups
- `recent_agent_decisions` - Latest recommendations
- `wellness_integrated_activities` - Activities with health context

### Migration

```bash
# Set DATABASE_URL
export DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Run migration
npm run db:migrate
```

### Repository Layer

`src/database/repository.ts` provides clean data access:

```typescript
import { TravelRepository } from './database/repository';

const repo = new TravelRepository(process.env.DATABASE_URL!);

// Create trip
const trip = await repo.createTrip({
  userId: 'user_123',
  name: 'Vietnam Golf + Japan Culture',
  startDate: '2026-02-16',
  endDate: '2026-03-26',
  budget: { total: 50000, spent: 0, currency: 'USD', categories: {...} },
  travelers: [...],
  status: 'planning',
});

// Save agent decision
await repo.saveAgentDecision({
  tripId: trip.id,
  date: '2026-02-20',
  agentType: 'health_recovery',
  decision: 'Force rest day',
  rationale: 'Sleep quality <3/5 for 2 nights',
  inputSignals: {...},
  outputActions: [...],
  timestamp: new Date().toISOString(),
  approvalRequired: true,
});

// Get wellness profile
const wellness = await repo.getWellnessProfile('user_123');
```

---

## Lab Registry & Discovery

### Location
`src/mcp/lab-registry.ts`

### Components

#### 1. **LabRegistryService**
Manages lab registration and metadata.

Methods:
- `getLabInfo()` - Lab metadata for discovery
- `getCapabilities()` - Detailed agent specifications
- `getOnboardingFlow()` - User onboarding steps
- `exportManifest()` - Full manifest for platform integration
- `activateLab(activation)` - Create activation record
- `markLaunched(activationId)` - Mark lab as launched

#### 2. **CloudPeersPlatformIntegration**
Handles integration with CloudPeers Platform.

Methods:
- `handlePlatformActivation(platformData)` - Process incoming user from platform
- `reportMilestone(milestone)` - Report achievements back to platform

### Lab Manifest

The manifest is auto-generated and includes:

```json
{
  "version": "1.0",
  "type": "experience_lab",
  "lab": {
    "labId": "slow-luxury-travel",
    "name": "Slow Luxury Travel Experience Lab",
    "category": "travel_wellness",
    ...
  },
  "capabilities": {
    "agents": [...],
    "dataModels": [...],
    "externalIntegrations": {...}
  },
  "onboarding": {
    "steps": [
      { "step": 1, "type": "welcome", ... },
      { "step": 2, "type": "outcome_selection", ... },
      { "step": 3, "type": "wellness_integration", ... },
      ...
    ],
    "estimatedDuration": "3-5 minutes"
  },
  "mcpProtocol": {
    "version": "1.0",
    "transport": "stdio",
    "tools": [...],
    "resources": [...]
  }
}
```

### Activation Flow

1. **User on CloudPeers Platform**
   - Selects outcome: "multi-week trip"
   - Importance rating: 3/5
   - Platform routes to Slow Luxury Travel

2. **Platform calls our activation endpoint**
   ```typescript
   POST /api/lab/activate
   {
     "userId": "user_123",
     "sessionId": "session_abc",
     "selectedOutcome": "multi_week_asia",
     "selectedImportance": 3,
     "returnUrl": "https://cloudpeers.com/dashboard"
   }
   ```

3. **We create activation record**
   ```typescript
   const activation = await labRegistry.activateLab({
     userId: 'user_123',
     labId: 'slow-luxury-travel',
     activationRoute: 'cloudpeers_platform',
     userOutcome: 'multi_week_asia',
     selectedImportance: 3,
   });
   ```

4. **Return onboarding flow**
   - 6-step wizard
   - Wellness integration (optional)
   - Agent preview
   - Launch CTA

5. **Mark as launched when complete**
   ```typescript
   await labRegistry.markLaunched(activationId);
   ```

---

## Integration Testing

### Test MCP Server

```bash
# Terminal 1: Start MCP server
npm run dev:mcp

# Terminal 2: Connect with MCP Inspector
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

### Test A2A Communication

```typescript
// test-a2a.ts
import { A2AManager } from './src/mcp/a2a-bridge';

const manager = A2AManager.getInstance();
await manager.initialize();

const carepeersClient = manager.getCarePeersClient();
if (carepeersClient) {
  const profile = await carepeersClient.getWellnessProfile('user_123');
  console.log('Wellness profile:', profile);
}
```

### Test Lab Registration

```bash
curl http://localhost:3002/api/lab/manifest
```

---

## Deployment

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/slow_luxury_travel

# MCP Server
MCP_ENDPOINT=stdio://slow-luxury-travel

# CarePeers A2A
CAREPEERS_MCP_COMMAND=node
CAREPEERS_MCP_ARGS=/path/to/carepeers/dist/mcp/server.js
CAREPEERS_API_KEY=secret_key

# CloudPeers Platform
CLOUDPEERS_PLATFORM_URL=https://platform.cloudpeers.com
CLOUDPEERS_API_KEY=secret_key
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  slow-luxury-travel:
    build: .
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/slow_luxury_travel
      - NODE_ENV=production
    ports:
      - "3002:3002"
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=slow_luxury_travel
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql

volumes:
  postgres_data:
```

### Google Cloud Run

```bash
# Build and deploy
gcloud run deploy slow-luxury-travel \
  --source . \
  --region us-central1 \
  --set-env-vars DATABASE_URL=$DATABASE_URL \
  --allow-unauthenticated
```

---

## Usage Examples

### 1. Analyze Daily Itinerary via MCP

```typescript
// From Claude Desktop or another MCP client
const result = await callTool('slow-luxury-travel', 'analyze_daily_itinerary', {
  tripId: 'trip_123',
  userId: 'user_123',
  date: '2026-02-20',
  currentItinerary: {
    date: '2026-02-20',
    location: 'Da Nang',
    primaryIntent: 'golf',
    schedule: {...},
  },
  travelerFeedback: {
    energyRating: 3,
    sleepQuality: 3,
  },
  weather: {
    temperature: 34,
    humidity: 78,
  },
});

// Result: Multi-agent recommendation
{
  "decision": "Skip golf - force recovery day",
  "priority": "high",
  "rationale": "Back-to-back golf with medium energy after poor sleep...",
  "outputActions": [
    "Cancel Montgomerie Links round",
    "Schedule spa treatment",
    "Allow sleeping in",
    ...
  ],
  "approvalRequired": true
}
```

### 2. Fetch Wellness Profile from CarePeers

```typescript
// A2A call to CarePeers
const carepeersClient = A2AManager.getInstance().getCarePeersClient();
const wellness = await carepeersClient.getWellnessProfile('user_123');

// Result:
{
  "userId": "user_123",
  "who5Score": 68,
  "sleepQuality": 3,
  "energyLevel": "medium",
  "stepsTarget": 7500,
  "mobilityLevel": "full",
  ...
}
```

### 3. Register with CloudPeers Platform

```typescript
// Export manifest
const labRegistry = new LabRegistryService(repository);
const manifest = labRegistry.exportManifest();

// POST to platform
await fetch('https://platform.cloudpeers.com/api/labs/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CLOUDPEERS_API_KEY}`,
  },
  body: JSON.stringify(manifest),
});
```

---

## Benefits of MCP/A2A Architecture

### 1. **Service Independence**
- Each lab runs as separate service
- Independent scaling and deployment
- Clear service boundaries

### 2. **Agent Interoperability**
- Travel agents can call wellness agents
- Budget agents can query booking agents
- Cross-service optimization

### 3. **Discovery & Registration**
- Labs auto-register with platform
- Users discover labs via manifest
- Dynamic capability advertisement

### 4. **Data Privacy**
- User controls data sharing via MCP
- Audit trail of all A2A calls
- Granular permission model

### 5. **Extensibility**
- Add new agents without platform changes
- Connect to new services via MCP
- Plug-and-play architecture

---

## Next Steps - Phase 3

### Week 1-2: External APIs
- [ ] Amadeus flight booking integration
- [ ] Booking.com hotel API
- [ ] Google Maps routing
- [ ] Weather API

### Week 3-4: Frontend
- [ ] Trip creation wizard
- [ ] Daily feedback mobile app
- [ ] Agent decision dashboard
- [ ] Budget visualization

### Week 5-6: Production
- [ ] Load testing
- [ ] Monitoring and alerts
- [ ] Documentation for operators
- [ ] Pricing and payments

---

## Summary

✅ **MCP Server**: 7 tools, 6 resources, stdio transport
✅ **A2A Bridge**: Connects to CarePeers for wellness data
✅ **Database**: 14 tables with full trip/agent/wellness schema
✅ **Lab Registry**: Discoverable Experience Lab with onboarding
✅ **Service Discovery**: Auto-discovers and connects to MCP services

**The service is now a fully-functional MCP-based Experience Lab ready for platform integration.**
