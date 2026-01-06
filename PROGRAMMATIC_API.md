## Programmatic API Guide

Complete guide for using Slow Luxury Travel programmatically via the TypeScript SDK.

---

## Quick Start

### Installation

```bash
cd /Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel
npm install
npm run build
```

### Basic Usage

```typescript
import { createSlowLuxuryClient } from './src/client/slow-luxury-client';

// Create and connect
const client = await createSlowLuxuryClient({
  databaseUrl: process.env.DATABASE_URL,
});

// Use agents
const recommendation = await client.getHealthRecoveryAnalysis({
  userId: 'user_123',
  date: '2026-02-20',
  sleepQuality: 3,
  energyRating: 3,
  consecutiveActiveDays: 4,
});

console.log(recommendation.decision);

// Disconnect
await client.disconnect();
```

---

## SDK API Reference

### SlowLuxuryClient

Main client class for interacting with travel agents.

#### Constructor

```typescript
new SlowLuxuryClient(config?: SlowLuxuryClientConfig)
```

**Config Options**:
```typescript
interface SlowLuxuryClientConfig {
  command?: string;        // Default: 'node'
  args?: string[];         // Default: ['dist/mcp/server.js']
  env?: Record<string, string>;
  databaseUrl?: string;    // PostgreSQL connection string
}
```

#### Methods

##### Connection

**`connect(): Promise<void>`**
- Connects to the MCP server
- Must be called before using any agent methods

**`disconnect(): Promise<void>`**
- Disconnects from the MCP server
- Clean up resources

**`isConnected(): boolean`**
- Check if currently connected

##### Agent Methods

**`analyzeDailyItinerary(params): Promise<AgentRecommendation>`**

Full multi-agent analysis coordinated by Travel Experience Agent (TXA).

```typescript
await client.analyzeDailyItinerary({
  tripId: string,
  userId: string,
  date: string,
  trip: Trip,
  currentItinerary: DailyItinerary,
  travelerFeedback?: {
    energyRating?: number,
    sleepQuality?: number,
    satisfactionScore?: number,
    notes?: string,
  },
  weather?: {
    condition: string,
    temperature: number,
    humidity: number,
  },
  wellnessProfile?: WellnessProfile,
});
```

**Returns**: Multi-agent recommendation with:
- `decision`: What to do
- `rationale`: Why this decision was made
- `outputActions`: List of specific actions
- `priority`: 'low' | 'medium' | 'high' | 'critical'
- `approvalRequired`: boolean

---

**`getHealthRecoveryAnalysis(params): Promise<AgentRecommendation>`**

Health-focused analysis for rest day recommendations.

```typescript
await client.getHealthRecoveryAnalysis({
  userId: string,
  date: string,
  sleepQuality?: number,        // 1-5
  energyRating?: number,         // 1-5
  consecutiveActiveDays: number,
  plannedActivity?: {
    type: string,
    physicalLoad: 'low' | 'medium' | 'high',
    estimatedSteps?: number,
  },
  wellnessProfile?: WellnessProfile,
});
```

**Decision Rules**:
- Force rest day if sleep <3/5 for 2 nights
- Cap walking to <8,000 steps
- Insert wellness activities after 3 active days

---

**`getGolfOperationsPlanning(params): Promise<AgentRecommendation>`**

Golf course optimization (Vietnam only).

```typescript
await client.getGolfOperationsPlanning({
  userId: string,
  date: string,
  location: string,
  energyLevel?: number,          // 1-5
  consecutiveGolfDays: number,
  weatherForecast?: {
    condition: string,
    temperature: number,
    humidity: number,
    rainfall?: number,
  },
  availableCourses: Array<{
    name: string,
    travelTime: number,          // minutes
    difficulty: 'easy' | 'moderate' | 'challenging',
    climate: 'hot' | 'cool' | 'mountain',
  }>,
});
```

**Decision Rules**:
- Max 3 rounds per 7-day period
- No back-to-back rounds if energy <4/5
- Substitute to Ba Na Hills in high heat

---

**`checkBudget(params): Promise<AgentRecommendation>`**

Budget monitoring and reallocation.

```typescript
await client.checkBudget({
  tripId: string,
  userId: string,
  date: string,
  trip: Trip,
  categorySpend: Record<string, { planned: number; actual: number }>,
  upcomingExpenses?: Array<{
    category: string,
    amount: number,
    description: string,
  }>,
  unusedPrepaid?: Array<{
    category: string,
    amount: number,
    item: string,
  }>,
});
```

**Alerts**:
- 10% variance = warning
- 20% variance = critical

---

**`reviewTransportLogistics(params): Promise<AgentRecommendation>`**

Transport reliability and risk mitigation.

```typescript
await client.reviewTransportLogistics({
  userId: string,
  date: string,
  currentLocation: string,
  nextDestination?: string,
  transportType?: 'flight' | 'train' | 'private_car' | 'taxi',
  departureTime?: string,
  arrivalTime?: string,
  luggageCount?: number,
  mobilityConsiderations?: string[],
});
```

**Buffers**:
- International flight: 120 minutes
- Domestic flight: 90 minutes
- Golf transfer: 45 minutes

---

**`createTrip(params): Promise<{ success: boolean; trip: Trip; message: string }>`**

Create a new trip.

```typescript
await client.createTrip({
  userId: string,
  name: string,
  startDate: string,           // ISO datetime
  endDate: string,             // ISO datetime
  budget: {
    total: number,
    categories: Record<string, number>,
  },
  travelers: Array<{
    id: string,
    name: string,
    email: string,
    wellnessProfileId?: string,
  }>,
});
```

---

**`getWellnessConstraints(params): Promise<WellnessProfile>`**

Fetch wellness profile from CarePeers (via A2A).

```typescript
await client.getWellnessConstraints({
  userId: string,
});
```

##### Resource Methods

**`getLabInfo(): Promise<any>`**

Get lab metadata (name, category, capabilities, pricing).

**`getLabCapabilities(): Promise<any>`**

Get detailed agent specifications and rules.

**`listTools(): Promise<any[]>`**

List all available MCP tools.

**`listResources(): Promise<any[]>`**

List all available MCP resources.

---

## Example Scripts

### 1. Basic Health Check

```bash
tsx examples/01-basic-health-check.ts
```

Analyzes a traveler's health status and recommends rest day or activity.

**Scenario**:
- Sleep quality: 3/5
- Energy: 3/5
- 4 consecutive active days
- Planned: High-intensity golf

**Expected Output**:
```
Decision: Skip golf - force recovery day
Priority: HIGH
Rationale: 4 consecutive active days with moderate sleep requires rest...
Actions:
  1. Cancel all scheduled activities
  2. Schedule spa treatment
  3. Allow sleeping in
  4. Early dinner and bedtime
```

---

### 2. Golf Planning

```bash
tsx examples/02-golf-planning.ts
```

Optimizes golf course selection based on weather and energy.

**Scenario**:
- Location: Da Nang, Vietnam
- Weather: 34°C, 78% humidity
- Energy: 4/5
- Available courses: 3

**Expected Output**:
```
Decision: Proceed with golf at Ba Na Hills Golf Club
Priority: MEDIUM
Rationale: High heat forecast - mountain course preferred...
Actions:
  1. Book tee time at Ba Na Hills Golf Club
  2. Earlier tee time (before 8am)
  3. Confirm caddie and cart included
  4. Travel time: 60 minutes
```

---

### 3. Full Day Analysis

```bash
tsx examples/03-full-day-analysis.ts
```

Runs complete TXA multi-agent analysis.

**Scenario**:
- Day 5 in Da Nang
- Second consecutive golf day
- Sleep: 3/5, Energy: 3/5
- Weather: 34°C
- Knee soreness reported

**Expected Output**:
```
Decision: Health priority override
Priority: HIGH
Rationale: Health & recovery agent recommends intervention...
Actions:
  1. Cancel Montgomerie Links round
  2. Schedule spa treatment
  3. Insert full rest day
  ⚠️ APPROVAL REQUIRED
```

---

### 4. Trip Creation

```bash
tsx examples/04-trip-creation.ts
```

Creates a new trip with budget allocation.

**Scenario**:
- 4-week Southeast Asia trip
- $45,000 budget
- 2 travelers
- Budget breakdown across 7 categories

**Expected Output**:
```
Trip Created
Trip ID: trip_1234567890
Budget Breakdown:
  flights         $10,000 (22.2%)
  hotels          $15,000 (33.3%)
  golf            $ 6,000 (13.3%)
  ...
Travelers:
  1. John Smith (john@example.com)
  2. Jane Smith (jane@example.com)
```

---

### 5. Lab Discovery

```bash
tsx examples/05-lab-discovery.ts
```

Discovers lab capabilities and available agents.

**Output**:
- Lab metadata
- Agent details
- MCP tools
- MCP resources

---

## Integration Patterns

### Pattern 1: Daily Check-In Loop

```typescript
import { createSlowLuxuryClient } from './src/client/slow-luxury-client';

async function dailyCheckIn(tripId: string, userId: string) {
  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  // Get today's itinerary (from database)
  const itinerary = await getItinerary(tripId, new Date());

  // Get traveler feedback (from mobile app)
  const feedback = await getTravelerFeedback(userId);

  // Get weather forecast (from API)
  const weather = await getWeatherForecast(itinerary.location);

  // Run agent analysis
  const recommendation = await client.analyzeDailyItinerary({
    tripId,
    userId,
    date: itinerary.date,
    trip: await getTrip(tripId),
    currentItinerary: itinerary,
    travelerFeedback: feedback,
    weather,
  });

  // If approval required, notify traveler
  if (recommendation.approvalRequired) {
    await sendNotification(userId, {
      title: 'Agent Recommendation',
      body: recommendation.decision,
      priority: recommendation.priority,
    });
  }

  // Save decision to database
  await saveAgentDecision(tripId, recommendation);

  await client.disconnect();
  return recommendation;
}
```

---

### Pattern 2: Wellness-Aware Planning

```typescript
async function planActivityWithWellness(
  userId: string,
  activityType: string,
  physicalLoad: 'low' | 'medium' | 'high'
) {
  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  // Get wellness profile from CarePeers
  const wellness = await client.getWellnessConstraints({ userId });

  // Get recent activity history
  const recentDays = await getRecentActiveDays(userId);

  // Get health recommendation
  const recommendation = await client.getHealthRecoveryAnalysis({
    userId,
    date: new Date().toISOString(),
    sleepQuality: wellness.sleepQuality,
    energyRating: mapEnergyLevel(wellness.energyLevel),
    consecutiveActiveDays: recentDays,
    plannedActivity: {
      type: activityType,
      physicalLoad,
      estimatedSteps: estimateSteps(activityType, physicalLoad),
    },
    wellnessProfile: wellness,
  });

  await client.disconnect();
  return {
    approved: recommendation.priority !== 'critical',
    recommendation,
    wellness,
  };
}
```

---

### Pattern 3: Budget Monitoring Service

```typescript
async function monitorBudget(tripId: string) {
  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  const trip = await getTrip(tripId);
  const categorySpend = await getCategorySpend(tripId);

  const recommendation = await client.checkBudget({
    tripId,
    userId: trip.userId,
    date: new Date().toISOString(),
    trip,
    categorySpend,
  });

  // If critical variance, alert user
  if (recommendation.priority === 'critical') {
    await sendAlert(trip.userId, {
      type: 'budget_critical',
      message: recommendation.decision,
      actions: recommendation.outputActions,
    });
  }

  await client.disconnect();
  return recommendation;
}

// Run every day at 8am
schedule.scheduleJob('0 8 * * *', async () => {
  const activeTrips = await getActiveTrips();
  for (const trip of activeTrips) {
    await monitorBudget(trip.id);
  }
});
```

---

## Error Handling

### Connection Errors

```typescript
import { createSlowLuxuryClient } from './src/client/slow-luxury-client';

try {
  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  // Use client...

  await client.disconnect();
} catch (error) {
  if (error.message.includes('ECONNREFUSED')) {
    console.error('MCP server not running. Start with: npm run dev:mcp');
  } else if (error.message.includes('Database')) {
    console.error('Database connection failed. Check DATABASE_URL');
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Agent Errors

```typescript
try {
  const recommendation = await client.analyzeDailyItinerary({...});
} catch (error) {
  console.error('Agent analysis failed:', error);
  // Fallback: use default recommendations or notify operator
}
```

---

## Testing

### Unit Test Example

```typescript
import { createSlowLuxuryClient } from '../src/client/slow-luxury-client';

describe('SlowLuxuryClient', () => {
  let client: SlowLuxuryClient;

  beforeEach(async () => {
    client = await createSlowLuxuryClient({
      databaseUrl: process.env.TEST_DATABASE_URL,
    });
  });

  afterEach(async () => {
    await client.disconnect();
  });

  it('should recommend rest day for low energy', async () => {
    const recommendation = await client.getHealthRecoveryAnalysis({
      userId: 'test_user',
      date: '2026-02-20',
      sleepQuality: 2,
      energyRating: 2,
      consecutiveActiveDays: 5,
    });

    expect(recommendation.priority).toBe('high');
    expect(recommendation.decision).toContain('rest day');
    expect(recommendation.approvalRequired).toBe(true);
  });
});
```

---

## TypeScript Types

All types are exported from `src/types/schema.ts`:

```typescript
import {
  Trip,
  DailyItinerary,
  Activity,
  GolfRound,
  TransportSegment,
  Accommodation,
  WellnessProfile,
  DailyFeedback,
  AgentDecision,
  TravelPreferences,
} from './src/types/schema';
```

Agent recommendation type:

```typescript
interface AgentRecommendation {
  decision: string;
  rationale: string;
  inputSignals: Record<string, any>;
  outputActions: string[];
  approvalRequired: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}
```

---

## Environment Variables

```bash
# Required for database persistence
DATABASE_URL=postgresql://localhost:5432/slow_luxury_travel

# Optional: Custom MCP server path
SLT_MCP_SERVER_PATH=/path/to/dist/mcp/server.js

# Optional: CarePeers A2A integration
CAREPEERS_MCP_COMMAND=node
CAREPEERS_MCP_ARGS=/path/to/carepeers/dist/mcp/server.js
```

---

## Performance Considerations

### Connection Pooling

The client uses a single MCP connection. For high-concurrency scenarios, use connection pooling:

```typescript
class SlowLuxuryClientPool {
  private clients: SlowLuxuryClient[] = [];
  private available: SlowLuxuryClient[] = [];

  async acquire(): Promise<SlowLuxuryClient> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }

    const client = await createSlowLuxuryClient({
      databaseUrl: process.env.DATABASE_URL,
    });
    this.clients.push(client);
    return client;
  }

  async release(client: SlowLuxuryClient): Promise<void> {
    this.available.push(client);
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.clients.map(c => c.disconnect()));
  }
}
```

### Batch Operations

For analyzing multiple days, batch requests:

```typescript
async function analyzeTripDays(
  trip: Trip,
  days: DailyItinerary[]
): Promise<AgentRecommendation[]> {
  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL,
  });

  const recommendations = await Promise.all(
    days.map(day =>
      client.analyzeDailyItinerary({
        tripId: trip.id,
        userId: trip.userId,
        date: day.date,
        trip,
        currentItinerary: day,
      })
    )
  );

  await client.disconnect();
  return recommendations;
}
```

---

## Next Steps

1. **Run Examples**: `tsx examples/01-basic-health-check.ts`
2. **Build Your Integration**: Use SDK in your application
3. **Add to CI/CD**: Run agent checks in automated pipelines
4. **Monitor**: Track agent decisions in database
5. **Extend**: Add custom agents or decision rules

---

## Support

For issues or questions:
- Check documentation: `/docs/`
- Review examples: `/examples/`
- Check MCP logs: stderr output from MCP server
- Test with MCP Inspector: `npx @modelcontextprotocol/inspector`
