# Programmatic Access - Quick Start

**The fastest way to use Slow Luxury Travel programmatically.**

---

## 🚀 5-Minute Setup

### 1. Build the Project

```bash
cd /Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel
npm run build
```

### 2. Run an Example

```bash
# Health check example (simplest)
npm run example:health
```

You should see agent recommendations in your terminal!

---

## 📚 Available Examples

Run any of these pre-built examples:

```bash
# 1. Basic health & recovery check
npm run example:health

# 2. Golf course optimization
npm run example:golf

# 3. Full multi-agent day analysis
npm run example:full

# 4. Create a new trip
npm run example:trip

# 5. Discover lab capabilities
npm run example:lab

# Run multiple examples
npm run examples
```

---

## 💻 Your First Script

Create `my-script.ts`:

```typescript
import { createSlowLuxuryClient } from './src/client/slow-luxury-client';

async function main() {
  // Connect to agents
  const client = await createSlowLuxuryClient({
    databaseUrl: process.env.DATABASE_URL, // Optional
  });

  console.log('✓ Connected to Slow Luxury Travel agents');

  // Ask the Health Agent for advice
  const recommendation = await client.getHealthRecoveryAnalysis({
    userId: 'my_user',
    date: '2026-02-20',
    sleepQuality: 3,         // Moderate sleep (1-5)
    energyRating: 3,         // Medium energy (1-5)
    consecutiveActiveDays: 4, // 4 days without rest
  });

  // Show recommendation
  console.log('\n=== AGENT RECOMMENDATION ===');
  console.log('Decision:', recommendation.decision);
  console.log('Priority:', recommendation.priority);
  console.log('\nActions:');
  recommendation.outputActions.forEach(action => {
    console.log('  -', action);
  });

  // Disconnect
  await client.disconnect();
}

main().catch(console.error);
```

Run it:

```bash
tsx my-script.ts
```

---

## 🎯 Common Use Cases

### Use Case 1: Should I Rest Today?

```typescript
const recommendation = await client.getHealthRecoveryAnalysis({
  userId: 'user_123',
  date: '2026-02-20',
  sleepQuality: 2,           // Poor sleep
  energyRating: 3,           // Medium energy
  consecutiveActiveDays: 5,  // 5 days straight
});

if (recommendation.priority === 'high') {
  console.log('TAKE A REST DAY');
} else {
  console.log('OK to continue activities');
}
```

### Use Case 2: Which Golf Course Should I Play?

```typescript
const recommendation = await client.getGolfOperationsPlanning({
  userId: 'user_123',
  date: '2026-02-21',
  location: 'Da Nang, Vietnam',
  energyLevel: 4,
  consecutiveGolfDays: 0,
  weatherForecast: {
    condition: 'sunny',
    temperature: 34,  // Hot!
    humidity: 78,
  },
  availableCourses: [
    {
      name: 'Montgomerie Links Vietnam',
      travelTime: 20,
      difficulty: 'moderate',
      climate: 'hot',
    },
    {
      name: 'Ba Na Hills Golf Club',
      travelTime: 60,
      difficulty: 'challenging',
      climate: 'mountain',  // Cooler!
    },
  ],
});

console.log('Recommended course:', recommendation.decision);
```

### Use Case 3: Analyze My Full Day

```typescript
const recommendation = await client.analyzeDailyItinerary({
  tripId: 'trip_123',
  userId: 'user_123',
  date: '2026-02-20',
  trip: myTrip,
  currentItinerary: todaysPlans,
  travelerFeedback: {
    energyRating: 3,
    sleepQuality: 3,
  },
  weather: {
    condition: 'sunny',
    temperature: 34,
    humidity: 78,
  },
});

if (recommendation.approvalRequired) {
  console.log('⚠️ IMPORTANT:', recommendation.decision);
  // Send notification to user
}
```

---

## 📖 Full API Documentation

See [PROGRAMMATIC_API.md](./PROGRAMMATIC_API.md) for:
- Complete SDK reference
- All agent methods
- Type definitions
- Integration patterns
- Error handling
- Testing examples

---

## 🔧 Configuration

### Optional: Database

If you want to persist trips and decisions:

```bash
# Set up PostgreSQL
export DATABASE_URL=postgresql://localhost:5432/slow_luxury_travel
createdb slow_luxury_travel
npm run db:migrate
```

Then pass it to the client:

```typescript
const client = await createSlowLuxuryClient({
  databaseUrl: process.env.DATABASE_URL,
});
```

**Without database**: The agents still work, but trips/decisions aren't saved.

---

## 🎓 Learning Path

1. **Run examples** (5 min)
   ```bash
   npm run example:health
   npm run example:golf
   ```

2. **Read example code** (10 min)
   - Open `examples/01-basic-health-check.ts`
   - See how the SDK is used
   - Modify parameters and re-run

3. **Write your own script** (15 min)
   - Copy an example
   - Change the scenario
   - Add your logic

4. **Integrate into your app** (30 min)
   - Import SDK in your code
   - Call agents when needed
   - Handle recommendations

---

## 💡 Pro Tips

### Tip 1: Skip Database for Testing

```typescript
// Works without DATABASE_URL
const client = await createSlowLuxuryClient();
```

### Tip 2: Batch Multiple Requests

```typescript
const [health, golf, budget] = await Promise.all([
  client.getHealthRecoveryAnalysis({...}),
  client.getGolfOperationsPlanning({...}),
  client.checkBudget({...}),
]);
```

### Tip 3: Reuse Connection

```typescript
const client = await createSlowLuxuryClient();

for (const day of days) {
  const rec = await client.analyzeDailyItinerary({...});
  console.log(rec.decision);
}

await client.disconnect();
```

---

## 🐛 Troubleshooting

### "Cannot find module"
```bash
npm run build  # Compile TypeScript first
```

### "Client not connected"
```typescript
// Must call connect() first
const client = new SlowLuxuryClient();
await client.connect();  // Don't forget this!
```

Or use helper function:
```typescript
const client = await createSlowLuxuryClient();  // Auto-connects
```

### "MCP server error"
```bash
# Make sure it's built
npm run build

# Test MCP server directly
npm run dev:mcp
```

---

## 📊 Example Output

Running `npm run example:health`:

```
=== Slow Luxury Travel: Health Check Example ===

✓ Connected to Slow Luxury Travel MCP server

Analyzing health status:
  Sleep Quality: 3/5
  Energy Level: 3/5
  Consecutive Active Days: 4
  Planned Activity: golf (high load)

=== HEALTH AGENT RECOMMENDATION ===

Decision: Skip golf - force recovery day
Priority: HIGH

Rationale:
4 consecutive active days with moderate sleep quality and medium
energy requires rest. Planned high-load activity risks fatigue
accumulation and injury.

Recommended Actions:
  1. Cancel all scheduled activities for the day
  2. Schedule spa treatment
  3. Allow sleeping in without alarm
  4. Light pool or lounge time only
  5. Early dinner and bedtime

⚠️  APPROVAL REQUIRED - High priority recommendation

✓ Disconnected
```

---

## 🚀 Next Steps

1. ✅ Run `npm run example:health`
2. ✅ Read the example code
3. ✅ Write your own script
4. ✅ Read full [PROGRAMMATIC_API.md](./PROGRAMMATIC_API.md)
5. ✅ Integrate into your application

---

## 📚 Resources

- **[PROGRAMMATIC_API.md](./PROGRAMMATIC_API.md)** - Full API documentation
- **[examples/](./examples/)** - 5 complete examples
- **[src/client/](./src/client/)** - SDK source code
- **[src/types/schema.ts](./src/types/schema.ts)** - TypeScript types

---

**You're ready to use Slow Luxury Travel programmatically! 🎉**

Start with `npm run example:health` and go from there.
