# MCP Setup Guide

## Slow Luxury Travel as MCP Service

This guide shows how to:
1. Run Slow Luxury Travel as an MCP server
2. Connect from Claude Desktop
3. Connect from other MCP clients
4. Test A2A communication with CarePeers

---

## 1. Prerequisites

### Install Dependencies

```bash
cd /Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel
npm install
npm run build
```

### Set Up Database

```bash
# Create PostgreSQL database
createdb slow_luxury_travel

# Set database URL
export DATABASE_URL=postgresql://localhost:5432/slow_luxury_travel

# Run migrations
npm run db:migrate
```

---

## 2. Running as MCP Server

### Development Mode

```bash
npm run dev:mcp
```

This starts the MCP server on stdio and logs to stderr.

### Production Mode

```bash
npm run build
npm run start:mcp
```

### Testing the Server

Use MCP Inspector to test:

```bash
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

This opens a web UI where you can:
- List available tools
- Call tools with test data
- Read resources
- View responses

---

## 3. Connect from Claude Desktop

### Step 1: Locate Claude Desktop Config

**macOS**:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux**:
```
~/.config/Claude/claude_desktop_config.json
```

### Step 2: Add Slow Luxury Travel Server

Edit the config file:

```json
{
  "mcpServers": {
    "slow-luxury-travel": {
      "command": "node",
      "args": [
        "/Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel/dist/mcp/server.js"
      ],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/slow_luxury_travel"
      }
    }
  }
}
```

**Important**: Update the path to match your installation directory.

### Step 3: Restart Claude Desktop

Quit and reopen Claude Desktop. The Slow Luxury Travel tools should appear in the MCP panel.

### Step 4: Test in Claude Desktop

Ask Claude:

```
Can you list the tools available from slow-luxury-travel?
```

Claude should respond with the 7 available tools:
1. analyze_daily_itinerary
2. health_recovery_analysis
3. golf_operations_planning
4. budget_control_check
5. transport_logistics_review
6. create_trip
7. get_wellness_constraints

### Step 5: Create a Test Trip

```
Use slow-luxury-travel to create a trip:
- Name: "Vietnam Golf Adventure"
- Start: 2026-02-16
- End: 2026-03-26
- Budget: $50,000
- User ID: user_demo_001
```

Claude will invoke the `create_trip` tool via MCP.

---

## 4. Connect Multiple MCP Services (A2A)

### Add CarePeers + Slow Luxury Travel

```json
{
  "mcpServers": {
    "carepeers": {
      "command": "node",
      "args": [
        "/path/to/carepeers/dist/mcp/server.js"
      ],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/carepeers"
      }
    },
    "slow-luxury-travel": {
      "command": "node",
      "args": [
        "/Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel/dist/mcp/server.js"
      ],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/slow_luxury_travel",
        "CAREPEERS_MCP_COMMAND": "node",
        "CAREPEERS_MCP_ARGS": "/path/to/carepeers/dist/mcp/server.js"
      }
    }
  }
}
```

Now Claude has access to **both** services and can:
- Get wellness profile from CarePeers
- Plan trip with Slow Luxury Travel
- Apply wellness constraints to travel planning

### Example A2A Workflow in Claude

```
1. Get my wellness profile from carepeers (user_123)
2. Use slow-luxury-travel to plan a 2-week trip to Vietnam
3. Make sure the trip respects my wellness constraints
   (sleep quality, energy levels, mobility)
```

Claude will:
1. Call `carepeers.get_wellness_profile`
2. Call `slow-luxury-travel.create_trip` with wellness data
3. Call `slow-luxury-travel.health_recovery_analysis` to validate

**This is A2A (Agent-to-Agent) communication in action.**

---

## 5. Programmatic MCP Client

You can also connect programmatically from Node.js:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Create client
const client = new Client(
  { name: 'my-app', version: '1.0.0' },
  { capabilities: {} }
);

// Connect to Slow Luxury Travel
const transport = new StdioClientTransport({
  command: 'node',
  args: ['/path/to/slow-luxury-travel/dist/mcp/server.js'],
  env: {
    DATABASE_URL: 'postgresql://localhost:5432/slow_luxury_travel',
  },
});

await client.connect(transport);

// List tools
const tools = await client.request(
  { method: 'tools/list' },
  { _meta: {} }
);
console.log('Available tools:', tools);

// Call a tool
const result = await client.request(
  {
    method: 'tools/call',
    params: {
      name: 'health_recovery_analysis',
      arguments: {
        userId: 'user_123',
        date: '2026-02-20',
        sleepQuality: 3,
        energyRating: 3,
        consecutiveActiveDays: 2,
      },
    },
  },
  { _meta: {} }
);

console.log('Agent recommendation:', result);

await client.close();
```

---

## 6. Available MCP Tools

### 1. `analyze_daily_itinerary`

Runs full multi-agent analysis on a day's itinerary.

**Example**:
```json
{
  "name": "analyze_daily_itinerary",
  "arguments": {
    "tripId": "trip_123",
    "userId": "user_123",
    "date": "2026-02-20",
    "currentItinerary": {
      "date": "2026-02-20",
      "location": "Da Nang, Vietnam",
      "primaryIntent": "golf",
      "schedule": {
        "morning": {
          "activity": "Golf at Montgomerie Links",
          "startTime": "07:30",
          "duration": 300
        }
      }
    },
    "travelerFeedback": {
      "energyRating": 3,
      "sleepQuality": 3
    },
    "weather": {
      "temperature": 34,
      "humidity": 78
    }
  }
}
```

**Response**:
```json
{
  "decision": "Skip golf - force recovery day",
  "priority": "high",
  "rationale": "Back-to-back golf with medium energy after poor sleep...",
  "outputActions": [
    "Cancel Montgomerie Links round",
    "Schedule spa treatment",
    ...
  ],
  "approvalRequired": true
}
```

### 2. `health_recovery_analysis`

Specialized health monitoring.

**Example**:
```json
{
  "name": "health_recovery_analysis",
  "arguments": {
    "userId": "user_123",
    "date": "2026-02-20",
    "sleepQuality": 2,
    "energyRating": 3,
    "consecutiveActiveDays": 4
  }
}
```

### 3. `golf_operations_planning`

Vietnam golf course optimization.

**Example**:
```json
{
  "name": "golf_operations_planning",
  "arguments": {
    "userId": "user_123",
    "date": "2026-02-21",
    "location": "Da Nang, Vietnam",
    "energyLevel": 4,
    "consecutiveGolfDays": 0,
    "weatherForecast": {
      "condition": "sunny",
      "temperature": 32,
      "humidity": 70
    },
    "availableCourses": [
      {
        "name": "Ba Na Hills Golf Club",
        "travelTime": 60,
        "difficulty": "challenging",
        "climate": "mountain"
      },
      {
        "name": "Montgomerie Links Vietnam",
        "travelTime": 20,
        "difficulty": "moderate",
        "climate": "hot"
      }
    ]
  }
}
```

### 4. `create_trip`

Initialize a new trip.

**Example**:
```json
{
  "name": "create_trip",
  "arguments": {
    "userId": "user_123",
    "name": "Vietnam Golf + Japan Culture - 38 Days",
    "startDate": "2026-02-16T00:00:00Z",
    "endDate": "2026-03-26T00:00:00Z",
    "budget": {
      "total": 50000,
      "categories": {
        "flights": 12000,
        "hotels": 18000,
        "golf": 5000,
        "food": 8000,
        "transport": 4000,
        "guides": 2000,
        "wellness": 1000
      }
    },
    "travelers": [
      {
        "id": "traveler_001",
        "name": "John Smith",
        "email": "john@example.com"
      }
    ]
  }
}
```

---

## 7. Available MCP Resources

### Read Lab Info

```typescript
const labInfo = await client.request(
  {
    method: 'resources/read',
    params: { uri: 'slt://lab/info' },
  },
  { _meta: {} }
);
```

### Read Lab Capabilities

```typescript
const capabilities = await client.request(
  {
    method: 'resources/read',
    params: { uri: 'slt://lab/capabilities' },
  },
  { _meta: {} }
);
```

### Read Trip Itinerary

```typescript
const itinerary = await client.request(
  {
    method: 'resources/read',
    params: { uri: 'slt://trips/trip_123/itinerary' },
  },
  { _meta: {} }
);
```

### Read Agent Decisions

```typescript
const decisions = await client.request(
  {
    method: 'resources/read',
    params: { uri: 'slt://trips/trip_123/decisions' },
  },
  { _meta: {} }
);
```

---

## 8. Troubleshooting

### Server won't start

**Check build**:
```bash
npm run build
ls dist/mcp/server.js  # Should exist
```

**Check DATABASE_URL**:
```bash
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1"
```

### Tools not appearing in Claude Desktop

**Check config path**:
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Check absolute path**:
Make sure the `args` path is absolute, not relative.

**Restart Claude Desktop**:
Completely quit and reopen.

**Check logs**:
Claude Desktop logs MCP errors to Console.app (macOS) or Event Viewer (Windows).

### A2A communication fails

**Check CarePeers is running**:
```bash
node /path/to/carepeers/dist/mcp/server.js
```

**Check environment variables**:
```bash
echo $CAREPEERS_MCP_COMMAND
echo $CAREPEERS_MCP_ARGS
```

**Test CarePeers MCP independently**:
```bash
npx @modelcontextprotocol/inspector node /path/to/carepeers/dist/mcp/server.js
```

---

## 9. Production Deployment

### Option A: Cloud Run with MCP Gateway

Deploy an HTTP gateway that wraps the stdio MCP server:

```typescript
// gateway.ts
import express from 'express';
import { spawn } from 'child_process';

const app = express();
app.use(express.json());

app.post('/mcp/call', async (req, res) => {
  const { method, params } = req.body;

  const child = spawn('node', ['dist/mcp/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // Pipe request to MCP server stdin
  child.stdin.write(JSON.stringify({ method, params }));
  child.stdin.end();

  // Collect response from stdout
  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.on('close', () => {
    res.json(JSON.parse(output));
  });
});

app.listen(3002);
```

### Option B: WebSocket Transport

MCP SDK supports WebSocket transport for remote connections:

```typescript
import { WebSocketServerTransport } from '@modelcontextprotocol/sdk/server/websocket.js';

const transport = new WebSocketServerTransport({
  port: 3003,
});

await server.connect(transport);
```

Clients can connect via:
```
wss://slow-luxury-travel.com/mcp
```

---

## 10. Security Considerations

### Authentication

When exposing MCP over HTTP/WebSocket, add authentication:

```typescript
app.use((req, res, next) => {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  })
);
```

### Data Privacy

- User data stays in your database
- MCP enables controlled sharing
- Audit all A2A calls in `agent_decisions` table

---

## Summary

✅ **MCP Server**: stdio transport, 7 tools, 6 resources
✅ **Claude Desktop**: Add to config, restart, use tools
✅ **A2A**: Connect multiple services for agent collaboration
✅ **Programmatic**: Use MCP SDK in your own apps
✅ **Production**: HTTP gateway or WebSocket transport

**The service is now fully MCP-compatible and ready for integration.**
