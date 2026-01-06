# CloudPeers Platform Integration Guide

**Service**: Active Living Lab (formerly Slow Luxury Travel)
**Lab ID**: `active-living-lab`
**Target Audience**: Active retirees (45-75 years old)
**Primary Outcome**: Multi-week trip planning with wellness integration

---

## Overview

The Active Living Lab is now integrated as an Experience Lab within the CloudPeers Platform at:
- **Platform URL**: https://cloudpeers-human-agent-orchestration-x2spb2gm7a-uw.a.run.app/
- **Lab ID**: `active-living-lab`
- **Service Name**: Active Living Lab
- **MCP Endpoint**: `stdio://active-living-lab` or configurable via `MCP_ENDPOINT` env var

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  CloudPeers Platform (Human-Agent Orchestration)           │
│  https://cloudpeers-human-agent-orchestration-x2spb2gm7a-uw.a.run.app/
│                                                              │
│  User selects outcome: "Multi-week trip"                   │
│  Lab activation: active-living-lab                         │
└────────────────────────────────────────────────────────────┘
                          ↓
                  (A2A/MCP Protocol)
                          ↓
┌────────────────────────────────────────────────────────────┐
│  CarePeers Service (Within CloudPeers MCP)                 │
│  Handles wellness profiles and care coordination           │
│                                                              │
│  Routes "active-living-lab" requests to Active Living Lab  │
└────────────────────────────────────────────────────────────┘
                          ↓
                  (A2A/MCP Protocol)
                          ↓
┌────────────────────────────────────────────────────────────┐
│  Active Living Lab (This Service)                          │
│  6 Travel Agents + Trip Planning                           │
│                                                              │
│  - Travel Experience Agent (TXA)                           │
│  - Health & Recovery Agent                                 │
│  - Golf Operations Agent                                   │
│  - Budget Control Agent                                    │
│  - Transport & Logistics Agent                             │
│  - Culture & Novelty Agent                                 │
└────────────────────────────────────────────────────────────┘
```

---

## Integration Flow

### 1. User Activation Flow

```
User Journey:
1. User visits CloudPeers Platform
2. User selects "Active Living" or "Multi-week trip" outcome
3. Platform creates activation session
4. Platform routes to CarePeers service
5. CarePeers delegates to Active Living Lab
6. Active Living Lab onboards user (6 steps)
7. User begins trip planning with AI agents
```

### 2. Activation Data Contract

**From CloudPeers Platform → CarePeers → Active Living Lab**:

```typescript
interface LabActivationRequest {
  userId: string;                // CloudPeers user ID
  sessionId: string;             // Platform session ID
  selectedOutcome: string;       // "multi-week-trip" or "active-living"
  selectedImportance: number;    // 1-5 scale
  returnUrl?: string;            // Return URL after completion
  userContext?: {
    age?: number;
    preferences?: string[];
    constraints?: string[];
  };
}
```

**Response from Active Living Lab**:

```typescript
interface LabActivationResponse {
  success: boolean;
  activationId: string;         // Active Living Lab activation ID
  labId: "active-living-lab";
  nextSteps: {
    message: string;
    onboarding: OnboardingFlow;
    estimatedCompletion: string; // e.g., "3-5 minutes"
  };
}
```

### 3. Wellness Profile Integration

Active Living Lab can request wellness data from CarePeers via A2A:

```typescript
// Active Living Lab → CarePeers
const wellnessProfile = await carePeersClient.getWellnessConstraints({
  userId: string
});

// Returns:
interface WellnessProfile {
  userId: string;
  who5Score?: number;           // WHO-5 Well-Being Index
  lifestylePillars?: {
    sleep: number;              // 0-100
    stress: number;
    nutrition: number;
    movement: number;
    social: number;
    substance: number;
  };
  careNeeds?: {
    adlIndependence: number;    // 0-6
    iadlIndependence: number;   // 0-8
    fallRisk: "low" | "moderate" | "high";
    mobilityLimitations: string[];
  };
  constraints: string[];        // ["max_walking_8000_steps", "no_high_heat"]
  preferences: string[];        // ["morning_activities", "cultural_experiences"]
}
```

---

## API Endpoints

### Active Living Lab API

**Base URL**: `http://localhost:3000` (development) or deployed URL

#### 1. Lab Discovery

```http
GET /api/mcp/resources/slt://lab/info
```

Returns lab manifest for CloudPeers Platform discovery.

**Response**:
```json
{
  "labId": "active-living-lab",
  "name": "Active Living Lab",
  "description": "Agent-operated premium travel service for active retirees...",
  "category": "active_lifestyle",
  "targetAudience": "Active retirees (45-75 years old)",
  "capabilities": [
    "Multi-agent trip planning",
    "Health-aware activity scheduling",
    "Golf operations optimization (Vietnam)",
    ...
  ],
  "mcpEndpoint": "stdio://active-living-lab",
  "status": "beta",
  "version": "0.1.0"
}
```

#### 2. Platform Activation Handler

```http
POST /api/platform/activate
Content-Type: application/json

{
  "userId": "user_123",
  "sessionId": "session_abc",
  "selectedOutcome": "multi-week-trip",
  "selectedImportance": 4,
  "returnUrl": "https://cloudpeers.com/dashboard"
}
```

**Response**:
```json
{
  "success": true,
  "activationId": "activation_xyz",
  "labId": "active-living-lab",
  "nextSteps": {
    "message": "Lab activation successful",
    "onboarding": {
      "steps": [...],
      "estimatedDuration": "3-5 minutes"
    },
    "estimatedCompletion": "3-5 minutes"
  }
}
```

#### 3. Trip Creation (Post-Onboarding)

```http
POST /api/trips
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user_123",
  "name": "Vietnam Golf & Culture",
  "startDate": "2026-03-15T00:00:00Z",
  "endDate": "2026-04-15T00:00:00Z",
  "budget": {
    "total": 45000,
    "categories": {
      "flights": 10000,
      "hotels": 15000,
      "golf": 6000,
      ...
    }
  },
  "travelers": [...]
}
```

#### 4. Wellness Integration

```http
POST /api/trips/{tripId}/wellness-sync
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user_123",
  "syncWithCarePeers": true
}
```

This triggers A2A call to CarePeers to fetch wellness profile.

---

## MCP Tools Available

Active Living Lab exposes these MCP tools for agent-to-agent communication:

### 1. analyze_daily_itinerary

Full multi-agent TXA analysis of a day's itinerary.

```json
{
  "name": "analyze_daily_itinerary",
  "inputSchema": {
    "tripId": "string",
    "userId": "string",
    "date": "string",
    "currentItinerary": "DailyItinerary",
    "travelerFeedback": {
      "energyRating": "number (1-5)",
      "sleepQuality": "number (1-5)"
    },
    "weather": {
      "condition": "string",
      "temperature": "number",
      "humidity": "number"
    }
  }
}
```

### 2. health_recovery_analysis

Focused health and recovery recommendations.

```json
{
  "name": "health_recovery_analysis",
  "inputSchema": {
    "userId": "string",
    "date": "string",
    "sleepQuality": "number (1-5)",
    "energyRating": "number (1-5)",
    "consecutiveActiveDays": "number"
  }
}
```

### 3. golf_operations_planning

Golf course optimization for Vietnam.

### 4. budget_control_check

Budget monitoring and reallocation.

### 5. transport_logistics_review

Transport reliability and risk mitigation.

### 6. create_trip

Programmatic trip creation.

### 7. get_wellness_constraints

Fetch wellness profile from CarePeers via A2A.

---

## Deployment Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# MCP Configuration
MCP_ENDPOINT=stdio://active-living-lab

# CarePeers A2A Integration
CAREPEERS_MCP_COMMAND=node
CAREPEERS_MCP_ARGS=/path/to/carepeers/dist/mcp/server.js

# CloudPeers Platform Integration
CLOUDPEERS_PLATFORM_URL=https://cloudpeers-human-agent-orchestration-x2spb2gm7a-uw.a.run.app
CLOUDPEERS_API_KEY=<platform_api_key>

# Service Configuration
PORT=3000
NODE_ENV=production
```

### Deployment Steps

1. **Build the service**:
   ```bash
   cd /Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel
   npm run build
   ```

2. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

3. **Start MCP server**:
   ```bash
   npm run start:mcp
   ```

4. **Start HTTP API** (for platform integration):
   ```bash
   npm start
   ```

5. **Register with CloudPeers Platform**:
   - Update CarePeers service routing to delegate `active-living-lab` to this service
   - Configure MCP endpoint in platform
   - Test activation flow

---

## CarePeers Service Integration

### Update CarePeers Routing

In `/Users/jenklin/dev/cloudpeers-mcp/carepeers/server/routes/labs.ts` (or equivalent):

```typescript
const LAB_TO_SERVICE_MAPPING = {
  'carepeers-lifestyle': 'carepeers-health',
  'active-living-lab': 'active-living-lab-mcp', // Route to Active Living Lab
  // ...
};

// MCP Service Configuration
const MCP_SERVICE_ENDPOINTS = {
  'active-living-lab-mcp': {
    command: process.env.ACTIVE_LIVING_LAB_MCP_COMMAND || 'node',
    args: [
      process.env.ACTIVE_LIVING_LAB_MCP_PATH ||
      '/path/to/active-living-lab/dist/mcp/server.js'
    ],
    env: process.env,
  },
};
```

### A2A Service Registration

Update CarePeers service registration to include Active Living Lab capability:

```typescript
// In scripts/validate-services.ts or service registry
{
  "agentId": "carepeers-health",
  "capabilities": [
    {
      "name": "active_living_lab_routing",
      "description": "Routes active retirees to Active Living Lab for multi-week trip planning"
    },
    {
      "name": "wellness_profile_sharing",
      "description": "Shares wellness profiles with Active Living Lab via A2A"
    }
  ],
  "semanticTags": {
    "experiences": ["active-living", "multi-week-travel", "wellness-travel"]
  }
}
```

---

## Testing Integration

### 1. Local Testing

```bash
# Terminal 1: Start CarePeers
cd /Users/jenklin/dev/cloudpeers-mcp/carepeers
npm run dev

# Terminal 2: Start Active Living Lab MCP Server
cd /Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel
npm run dev:mcp

# Terminal 3: Test activation
curl -X POST http://localhost:3000/api/platform/activate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_001",
    "sessionId": "session_test",
    "selectedOutcome": "multi-week-trip",
    "selectedImportance": 4
  }'
```

### 2. Test A2A Communication

```bash
# Test wellness profile fetch
cd /Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel
npm run example:lab
```

This should successfully connect to CarePeers and fetch wellness data.

### 3. Test Full Flow

```bash
# Create a trip with wellness integration
npm run example:trip
```

---

## Monitoring & Observability

### Health Checks

- **Active Living Lab**: `GET http://localhost:3000/health`
- **CarePeers**: `GET https://cloudpeers-human-agent-orchestration-x2spb2gm7a-uw.a.run.app/api/health`

### Logs

- All MCP communication logged to stderr
- HTTP API requests logged to stdout
- A2A calls tracked in database (`a2a_sync_log` table)

### Metrics to Track

- Lab activations per day
- Onboarding completion rate
- Trips created per week
- Agent decision approval rates
- Wellness profile sync success rate
- Average trip planning time

---

## Next Steps for Full Production

1. **Deploy Active Living Lab**
   - Deploy to Google Cloud Run or equivalent
   - Configure environment variables
   - Set up database (PostgreSQL)

2. **Update CarePeers Service**
   - Add routing for `active-living-lab`
   - Configure MCP endpoint
   - Test A2A communication

3. **CloudPeers Platform Updates**
   - Register Active Living Lab in platform
   - Update lab discovery
   - Configure activation flow

4. **Frontend Development**
   - Build trip planning UI
   - Create agent dashboard
   - Implement trip tracking

5. **Testing & QA**
   - End-to-end integration tests
   - Load testing
   - User acceptance testing

---

## Support & Documentation

- **Full API Reference**: [PROGRAMMATIC_API.md](./PROGRAMMATIC_API.md)
- **Quick Start Guide**: [PROGRAMMATIC_QUICKSTART.md](./PROGRAMMATIC_QUICKSTART.md)
- **MCP Setup**: [MCP_SETUP.md](./MCP_SETUP.md)
- **Phase 2 Details**: [PHASE_2_MCP_A2A.md](./PHASE_2_MCP_A2A.md)

---

**Status**: ✅ Ready for integration with CloudPeers Platform
**Last Updated**: January 6, 2026
**Maintainer**: CloudPeers Development Team
