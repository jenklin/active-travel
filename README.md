# Slow Luxury Travel Service

**Agent-operated premium travel service with wellness integration**

A specialized travel planning and orchestration platform that combines AI agent decision-making with wellness data from CarePeers to deliver adaptive, health-aware travel experiences for accomplished professionals.

---

## Overview

This service implements the **Slow Luxury Golf Asia™** travel product - a white-glove, agent-operated experience designed for 50-65 year old professionals who want world-class golf, cultural depth, and physical recovery without decision fatigue.

The platform uses a **multi-agent architecture** where specialized AI agents coordinate to optimize:
- Physical energy and recovery
- Golf quality and pacing
- Cultural depth without overload
- Logistics reliability
- Budget discipline

---

## Architecture

### Agent-Based System

```
┌─────────────────────────────────────────┐
│  Travel Experience Agent (TXA)          │
│  Main orchestrator - makes final calls  │
└────────────┬────────────────────────────┘
             │
       ┌─────┴─────┬──────────┬──────────┬─────────┐
       │           │          │          │         │
   ┌───▼──┐   ┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ┌─▼────┐
   │Health│   │ Golf  │  │Budget │  │Trans- │  │Cul-  │
   │      │   │       │  │       │  │port   │  │ture  │
   └──────┘   └───────┘  └───────┘  └───────┘  └──────┘
```

### Agents

1. **Travel Experience Agent (TXA)** - Main orchestrator
   - Coordinates all sub-agents
   - Makes final decisions on daily itinerary
   - Prioritizes: Health > Logistics > Budget > Novelty

2. **Health & Recovery Agent**
   - Monitors sleep quality, energy levels, consecutive active days
   - Recommends rest days and activity moderation
   - Integrates with CarePeers wellness profile

3. **Golf Operations Agent** (Vietnam only)
   - Optimizes tee times and course selection
   - Weather-aware substitutions
   - Prevents over-scheduling

4. **Budget Control Agent**
   - Tracks spend vs. planned budget by category
   - Alerts on variances >10%
   - Recommends reallocations

5. **Transport & Logistics Agent**
   - Ensures adequate buffers for flights/transfers
   - Identifies risk factors (luggage, mobility, early departures)
   - Reliability over speed

### CarePeers Integration

The service integrates with **CarePeers Experience Lab** via Model Context Protocol (MCP) to:
- Fetch user wellness profiles (WHO-5 score, 6 Lifestyle Medicine Pillars)
- Apply health constraints to activity planning
- Update wellness logs with travel activity data
- Get activity difficulty recommendations

---

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3
- **Framework**: Express.js
- **AI Integration**: Anthropic Claude (via @anthropic-ai/sdk)
- **MCP**: @modelcontextprotocol/sdk
- **Validation**: Zod schemas
- **Build**: tsx (development), tsc (production)

---

## Project Structure

```
active-travel/
├── src/
│   ├── agents/                    # AI agent implementations
│   │   ├── base-agent.ts          # Base class for all agents
│   │   ├── travel-experience-agent.ts  # Main TXA orchestrator
│   │   ├── health-recovery-agent.ts
│   │   ├── golf-operations-agent.ts
│   │   ├── budget-control-agent.ts
│   │   └── transport-logistics-agent.ts
│   │
│   ├── integrations/              # External service integrations
│   │   └── carepeers-mcp-client.ts  # CarePeers MCP client
│   │
│   ├── types/                     # TypeScript schemas
│   │   └── schema.ts              # Zod schemas for domain models
│   │
│   └── index.ts                   # Express API server
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- CarePeers MCP service running (for wellness integration)

### Installation

```bash
# Navigate to project directory
cd active-travel

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Variables

```bash
# Server Configuration
PORT=3002
NODE_ENV=development

# AI Provider
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# CarePeers MCP Integration
CAREPEERS_MCP_URL=http://localhost:3001/mcp
CAREPEERS_API_KEY=your_carepeers_api_key_here
```

### Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3002`

### Build for Production

```bash
npm run build
npm start
```

---

## API Endpoints

### Health Check

```bash
GET /health
```

Returns service status and version.

### Get Wellness Profile

```bash
GET /api/wellness/:userId
```

Fetches user wellness profile from CarePeers via MCP.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "who5Score": 75,
    "sleepQuality": 4,
    "energyLevel": "high",
    "stepsTarget": 8000,
    "mobilityLevel": "full"
  }
}
```

### Analyze Daily Itinerary

```bash
POST /api/analyze-day
Content-Type: application/json

{
  "tripId": "trip_123",
  "userId": "user_123",
  "date": "2026-02-20",
  "trip": { ... },
  "currentItinerary": { ... },
  "travelerFeedback": {
    "energyRating": 4,
    "sleepQuality": 3
  },
  "weather": {
    "condition": "sunny",
    "temperature": 32,
    "humidity": 75
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "decision": "Proceed with planned itinerary",
    "rationale": "All agent assessments favorable...",
    "inputSignals": { ... },
    "outputActions": [
      "All systems green",
      "Health: No intervention needed",
      "Transport: Plan confirmed"
    ],
    "approvalRequired": false,
    "priority": "low"
  }
}
```

### Update Wellness Log

```bash
POST /api/wellness/:userId/log
Content-Type: application/json

{
  "date": "2026-02-20",
  "sleep": { "quality": 4, "duration": 7.5 },
  "movement": { "steps": 8200, "activityMinutes": 90 },
  "stress": { "level": 2, "notes": "Relaxed day" }
}
```

### Get Activity Recommendations

```bash
GET /api/wellness/:userId/activity-recommendations/golf
```

Returns activity recommendations based on wellness profile.

---

## Agent Decision Flow

When analyzing a daily itinerary, the TXA follows this flow:

```
1. Collect context (trip, itinerary, feedback, weather)
2. Query all sub-agents in parallel:
   ├─> Health Agent
   ├─> Golf Operations Agent
   ├─> Budget Agent
   └─> Transport Agent
3. Apply coordination rules:
   Priority 1: Health & Safety (critical/high)
   Priority 2: Transport & Logistics (must be reliable)
   Priority 3: Budget Control (important)
   Priority 4: Activity Optimization (golf, culture)
4. Return final recommendation
5. Log decision for audit trail
```

### Coordination Rules (Section 11G)

> **"If sub-agent recommendations conflict, prioritize health, then logistics, then novelty."**

- Sub-agents provide **recommendations only**
- TXA makes **all final decisions**
- Health and safety override all other concerns
- Logistics must be reliable before optimizing experience

---

## Domain Models

### Key Schemas (Zod)

**Trip**: Top-level trip with budget, travelers, dates
**DailyItinerary**: Day-by-day schedule with intent and activities
**Activity**: Individual activity (golf, cultural, dining, etc.)
**GolfRound**: Golf-specific details (course, tee time, costs)
**TransportSegment**: Flight, train, or private car transfers
**Accommodation**: Hotel bookings
**WellnessProfile**: Health constraints from CarePeers
**DailyFeedback**: End-of-day traveler feedback
**AgentDecision**: Audit log of agent recommendations

See `src/types/schema.ts` for full definitions.

---

## Example: Health Agent Decision Logic

From `src/agents/health-recovery-agent.ts`:

```typescript
// Rule: If sleep quality < 3/5 for two consecutive nights,
// recommend full rest day

if (signals.sleepQuality < 3 || signals.energyRating < 2) {
  return this.recommendFullRestDay(signals);
}

// Rule: Cap walking-heavy days to <8,000 steps
if (signals.plannedSteps > signals.stepsTarget) {
  return this.recommendActivityModeration(signals);
}

// Rule: Insert spa/massage proactively after 3 consecutive active days
if (signals.consecutiveActiveDays >= 3) {
  return this.recommendWellnessActivity(signals);
}
```

---

## Roadmap

### Phase 1: Foundation ✅ (Completed)
- [x] Project structure and dependencies
- [x] TypeScript schemas for domain models
- [x] Base agent architecture
- [x] Health & Recovery Agent
- [x] Golf Operations Agent
- [x] Budget Control Agent
- [x] Transport Logistics Agent
- [x] Travel Experience Agent (TXA)
- [x] CarePeers MCP client
- [x] Express API server

### Phase 2: Integration (Next 2 weeks)
- [ ] Implement actual MCP protocol communication
- [ ] Connect to Anthropic Claude for AI reasoning
- [ ] Database layer (PostgreSQL) for trips/itineraries
- [ ] Authentication & authorization
- [ ] Webhook endpoints for real-time updates

### Phase 3: External APIs (Weeks 3-4)
- [ ] Amadeus flight booking integration
- [ ] Hotel booking API (Booking.com or Expedia)
- [ ] Golf course reservation systems
- [ ] Google Maps for routing and travel times
- [ ] Weather API integration

### Phase 4: Product Features (Weeks 5-6)
- [ ] Trip creation wizard
- [ ] Daily feedback collection UI
- [ ] Agent decision dashboard
- [ ] Budget tracking visualizations
- [ ] Traveler mobile app (notifications, check-ins)

### Phase 5: Production (Weeks 7-8)
- [ ] Load testing and optimization
- [ ] Monitoring and alerting
- [ ] Documentation for travel operators
- [ ] Pricing model and payments (Stripe)
- [ ] Google Cloud Run deployment

---

## Development Guidelines

### Adding a New Agent

1. Create agent file in `src/agents/`
2. Extend `BaseAgent` class
3. Implement `analyze(context)` method
4. Add to TXA orchestrator in `travel-experience-agent.ts`
5. Update coordination rules if needed

### Testing Agent Logic

```typescript
import { HealthRecoveryAgent } from './agents/health-recovery-agent';

const agent = new HealthRecoveryAgent();

const context = {
  tripId: 'test-trip',
  userId: 'test-user',
  date: '2026-02-20',
  sleepQuality: 2, // Poor sleep
  energyRating: 3,
  consecutiveActiveDays: 4,
};

const recommendation = await agent.analyze(context);

console.log(recommendation.decision); // "Cancel all planned activities..."
```

---

## Integration with CarePeers

This service is designed to **complement** the CarePeers Experience Lab by:

1. **Consuming wellness data** via MCP (read-only initially)
2. **Applying health constraints** to travel planning
3. **Reporting back activity data** for wellness tracking
4. **Supporting CarePeers users** who want wellness-integrated travel

### Data Flow

```
CarePeers Lab
    │
    ├─ (MCP) ──> Wellness Profile ──> Slow Luxury Travel
    │                                        │
    │                                   Apply constraints
    │                                        │
    │                                   Plan itinerary
    │                                        │
    │                                   Execute trip
    │                                        │
    └─ (MCP) <── Activity Logs <─────────────┘
```

---

## Contributing

This is a production service under active development. For bugs or feature requests, please contact the development team.

---

## License

MIT License - See LICENSE file for details

---

## Contact

For questions or support:
- **Product**: Slow Luxury Golf Asia™
- **Audience**: 50-65 y.o. professionals
- **Operating Model**: Human-in-the-loop AI travel agents

Built with wellness integration from CarePeers Experience Lab.
