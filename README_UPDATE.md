# README Update: Now an MCP/A2A Experience Lab

**Add this section to the main README.md**

---

## 🎯 Phase 2 Complete: MCP/A2A Experience Lab

Slow Luxury Travel is now a **fully-registered Experience Lab** with:

### ✅ MCP Server
- **7 MCP tools** exposing all travel agents
- **6 MCP resources** for trip data access
- **stdio transport** compatible with Claude Desktop
- Run: `npm run dev:mcp`

### ✅ A2A Communication
- **Bidirectional MCP** with CarePeers for wellness data
- **Service Discovery Registry** for finding other labs
- **Auto-connect** to configured services on startup
- See: `src/mcp/a2a-bridge.ts`

### ✅ PostgreSQL Database
- **14 tables**: trips, itineraries, activities, decisions, wellness, activations
- **3 views**: active trips, decisions, wellness-integrated activities
- **Full audit trail** of agent decisions
- Migrate: `npm run db:migrate`

### ✅ Lab Registry
- **Discoverable** by CloudPeers Platform
- **Onboarding flow** (6-step wizard)
- **Activation tracking** and milestone reporting
- **Manifest export** for platform integration

---

## Quick Start - MCP Mode

### 1. Install & Build
```bash
npm install
npm run build
```

### 2. Set Up Database
```bash
export DATABASE_URL=postgresql://localhost:5432/slow_luxury_travel
createdb slow_luxury_travel
npm run db:migrate
```

### 3. Run MCP Server
```bash
npm run dev:mcp
```

### 4. Connect from Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "active-travel": {
      "command": "node",
      "args": ["/full/path/to/active-travel/dist/mcp/server.js"],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/slow_luxury_travel"
      }
    }
  }
}
```

Restart Claude Desktop. The travel agents will appear as MCP tools.

---

## MCP Tools Available

| Tool | Agent | Purpose |
|------|-------|---------|
| `analyze_daily_itinerary` | TXA | Full multi-agent analysis |
| `health_recovery_analysis` | Health | Rest day recommendations |
| `golf_operations_planning` | Golf | Course optimization (Vietnam) |
| `budget_control_check` | Budget | Spending variance alerts |
| `transport_logistics_review` | Transport | Reliability checks |
| `create_trip` | TXA | Trip initialization |
| `get_wellness_constraints` | Integration | Fetch CarePeers data |

## MCP Resources Available

| URI | Description |
|-----|-------------|
| `slt://trips` | All trips |
| `slt://trips/{tripId}` | Trip details |
| `slt://trips/{tripId}/itinerary` | Daily itinerary |
| `slt://trips/{tripId}/decisions` | Agent decisions |
| `slt://lab/info` | Lab metadata |
| `slt://lab/capabilities` | Agent specs |

---

## A2A Integration with CarePeers

Slow Luxury Travel automatically connects to CarePeers MCP for wellness data:

```typescript
// Fetch wellness profile from CarePeers
const manager = A2AManager.getInstance();
await manager.initialize();

const carepeersClient = manager.getCarePeersClient();
const wellness = await carepeersClient.getWellnessProfile('user_123');

// Use in trip planning
const trip = await createTrip({
  userId: 'user_123',
  wellnessProfile: wellness, // Applies health constraints
  ...
});
```

**Configure in .env:**
```bash
CAREPEERS_MCP_COMMAND=node
CAREPEERS_MCP_ARGS=/path/to/carepeers/dist/mcp/server.js
CAREPEERS_API_KEY=your_api_key
```

---

## Documentation

### Setup & Configuration
- **[MCP_SETUP.md](./MCP_SETUP.md)** - Complete setup guide for MCP mode
- **[PHASE_2_MCP_A2A.md](./PHASE_2_MCP_A2A.md)** - Architecture documentation
- **[PHASE_2_COMPLETE.md](./PHASE_2_COMPLETE.md)** - Phase 2 summary

### Database
- **[schema.sql](./src/database/schema.sql)** - Full PostgreSQL schema
- **[repository.ts](./src/database/repository.ts)** - Data access layer

### Development
- **[example-usage.ts](./example-usage.ts)** - Agent usage examples
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Phase 1 summary

---

## Scripts

```bash
# Development
npm run dev              # Express API server (port 3002)
npm run dev:mcp          # MCP server (stdio)

# Production
npm run build            # Compile TypeScript
npm start                # Express API server
npm run start:mcp        # MCP server

# Database
npm run db:migrate       # Run PostgreSQL migrations

# Testing
npm test                 # Run tests (to be added)
```

---

## Project Stats

| Metric | Value |
|--------|-------|
| TypeScript Files | 13 |
| Lines of Code | ~4,200 |
| MCP Tools | 7 |
| MCP Resources | 6 |
| Database Tables | 14 |
| Agents | 6 |
| Total Time | 7 hours |

---

## What's Next - Phase 3

- [ ] Amadeus flight booking API
- [ ] Booking.com hotel integration
- [ ] Google Maps routing
- [ ] Weather API
- [ ] Trip creation UI
- [ ] Mobile app for daily feedback
- [ ] Agent decision dashboard
- [ ] Stripe payments

---

## License

MIT
