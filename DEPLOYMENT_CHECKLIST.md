# Active Living Lab - Deployment Checklist

**Status**: ✅ Configured and ready for deployment
**Integration**: CloudPeers Platform → Active Living Lab
**Target URL**: https://cloudpeers-human-agent-orchestration-x2spb2gm7a-uw.a.run.app/

---

## ✅ Completed Steps

### 1. Lab Registration Updated
- [x] Changed lab_id from `slow-luxury-travel` to `active-living-lab`
- [x] Updated target audience to "Active retirees (45-75 years old)"
- [x] Updated all branding and documentation
- [x] Updated package.json

### 2. CloudPeers Platform Integration Configured
- [x] Created platform integration routes (`/api/platform/`)
- [x] Added activation handler endpoint
- [x] Added lab discovery endpoints
- [x] Added milestone reporting
- [x] Created comprehensive integration guide

### 3. TypeScript Build
- [x] All code compiled successfully
- [x] Zero TypeScript errors
- [x] Platform routes included
- [x] Database integration ready

---

## 🚀 Remaining Deployment Steps

### Step 1: Deploy Active Living Lab Service

**Option A: Local Testing First**

```bash
# 1. Set environment variables
cd /Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel
export DATABASE_URL=postgresql://... # Your PostgreSQL connection string
export CAREPEERS_MCP_URL=http://localhost:3000/mcp
export PORT=3002

# 2. Run database migrations
npm run db:migrate

# 3. Start the service
npm start

# 4. Test health check
curl http://localhost:3002/health
```

**Option B: Deploy to Production**

```bash
# 1. Build for production
npm run build

# 2. Deploy to Google Cloud Run (or your platform)
gcloud run deploy active-living-lab \
  --source . \
  --region us-central1 \
  --set-env-vars DATABASE_URL=$DATABASE_URL \
  --set-env-vars CAREPEERS_MCP_URL=$CAREPEERS_MCP_URL \
  --allow-unauthenticated
```

---

### Step 2: Update CarePeers Service Routing

**File to modify**: `/Users/jenklin/dev/cloudpeers-mcp/carepeers/server/` (create or update routing)

**Add these configurations**:

```typescript
// In CarePeers server routing configuration
const LAB_TO_SERVICE_MAPPING = {
  'carepeers-lifestyle': 'carepeers-health',
  'active-living-lab': 'active-living-lab-mcp',  // NEW
};

// MCP Service Configuration
const MCP_SERVICE_ENDPOINTS = {
  'active-living-lab-mcp': {
    command: process.env.ACTIVE_LIVING_LAB_COMMAND || 'node',
    args: [
      process.env.ACTIVE_LIVING_LAB_PATH ||
      '/path/to/active-living-lab/dist/mcp/server.js'
    ],
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  },
};
```

**Set environment variables in CarePeers**:

```bash
# In CarePeers deployment environment
ACTIVE_LIVING_LAB_COMMAND=node
ACTIVE_LIVING_LAB_PATH=/path/to/active-living-lab/dist/mcp/server.js
```

---

### Step 3: Test Integration End-to-End

**Test 1: Lab Discovery**

```bash
# Test from Active Living Lab directly
curl http://localhost:3002/api/platform/lab/info

# Expected response:
{
  "labId": "active-living-lab",
  "name": "Active Living Lab",
  "targetAudience": "Active retirees (45-75 years old)",
  ...
}
```

**Test 2: Platform Activation**

```bash
# Test activation endpoint
curl -X POST http://localhost:3002/api/platform/activate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_001",
    "sessionId": "session_test_123",
    "selectedOutcome": "multi-week-trip",
    "selectedImportance": 4
  }'

# Expected response:
{
  "success": true,
  "activationId": "activation_...",
  "nextSteps": {
    "message": "Lab activation successful",
    "onboarding": {...},
    "estimatedCompletion": "3-5 minutes"
  }
}
```

**Test 3: A2A Communication (via MCP)**

```bash
# Test wellness profile fetch from CarePeers
cd /Users/jenklin/dev/cloudpeers-mcp/slow-luxury-travel
npm run example:lab

# Should successfully connect to CarePeers and fetch wellness data
```

**Test 4: Full User Flow**

1. User visits CloudPeers Platform: https://cloudpeers-human-agent-orchestration-x2spb2gm7a-uw.a.run.app/
2. User selects "Active Living" or "Multi-week trip" outcome
3. Platform routes to CarePeers service
4. CarePeers delegates to Active Living Lab
5. Active Living Lab onboards user (6 steps)
6. User begins trip planning with AI agents

---

## 📝 Integration Summary

### Architecture Flow

```
User
  ↓
CloudPeers Platform (https://cloudpeers-human-agent-orchestration...)
  ↓
CarePeers Service (routes "active-living-lab")
  ↓ (A2A/MCP)
Active Living Lab (this service)
  ↓
6 Travel Agents (TXA, Health, Golf, Budget, Transport, Culture)
```

### Key Endpoints

**Active Living Lab**:
- `GET /api/platform/lab/info` - Lab discovery
- `GET /api/platform/lab/manifest` - Full manifest
- `POST /api/platform/activate` - Handle activation
- `POST /api/platform/report-milestone` - Report milestones
- `GET /health` - Health check

**MCP Server**:
- `stdio://active-living-lab` - MCP endpoint
- 7 tools exposed (analyze_daily_itinerary, health_recovery_analysis, etc.)
- 6 resources exposed (trips, itineraries, decisions, etc.)

---

## 🔍 Verification Checklist

Before going live, verify:

- [ ] Active Living Lab service starts without errors
- [ ] Health endpoint returns 200 OK
- [ ] Lab info endpoint returns correct data (lab_id: "active-living-lab")
- [ ] Platform activation creates activation record in database
- [ ] CarePeers can route to Active Living Lab via MCP
- [ ] A2A communication works (wellness profile fetch)
- [ ] MCP server can be started independently
- [ ] All 6 travel agents function correctly
- [ ] Database migrations applied successfully
- [ ] Environment variables configured correctly

---

## 📊 Monitoring

### Health Checks

- **Active Living Lab HTTP**: `GET http://localhost:3002/health`
- **Active Living Lab MCP**: `npm run dev:mcp` (check stderr for "MCP server started")
- **CarePeers**: `GET https://cloudpeers-human-agent-orchestration-x2spb2gm7a-uw.a.run.app/api/health`

### Logs to Monitor

- Platform activation requests
- MCP tool invocations
- Agent decision logs
- A2A communication logs
- Database connection status
- Wellness profile sync success/failure

### Key Metrics

- Lab activations per day
- Onboarding completion rate (target: >75%)
- Trip creation rate
- Agent decision approval rate
- Wellness profile sync success rate (target: >95%)
- Average trip planning time

---

## 🔧 Troubleshooting

### Issue: Active Living Lab service won't start

**Check**:
- Node.js version (must be >=18.0.0)
- TypeScript compiled (`npm run build`)
- DATABASE_URL is valid (or omit for testing without DB)
- Port 3002 is available

### Issue: CarePeers can't find Active Living Lab

**Check**:
- MCP server is running (`npm run start:mcp`)
- Environment variables in CarePeers point to correct path
- `active-living-lab` is registered in LAB_TO_SERVICE_MAPPING

### Issue: A2A communication fails

**Check**:
- CarePeers MCP server is running
- CAREPEERS_MCP_URL environment variable is correct
- Network connectivity between services

### Issue: Platform activation fails

**Check**:
- Request has all required fields (userId, sessionId, selectedOutcome)
- Database connection is working (if using DATABASE_URL)
- Check logs for specific error messages

---

## 📚 Documentation

- **[CLOUDPEERS_PLATFORM_INTEGRATION.md](./CLOUDPEERS_PLATFORM_INTEGRATION.md)** - Full integration guide
- **[PROGRAMMATIC_API.md](./PROGRAMMATIC_API.md)** - Complete API reference
- **[PROGRAMMATIC_QUICKSTART.md](./PROGRAMMATIC_QUICKSTART.md)** - Quick start guide
- **[MCP_SETUP.md](./MCP_SETUP.md)** - MCP setup instructions
- **[PHASE_2_MCP_A2A.md](./PHASE_2_MCP_A2A.md)** - A2A architecture details

---

## 🎯 Success Criteria

The integration is successful when:

1. ✅ Active Living Lab service runs without errors
2. ✅ CloudPeers Platform can discover the lab
3. ✅ Platform activation creates activation record
4. ✅ User can complete 6-step onboarding flow
5. ✅ Travel agents provide recommendations
6. ✅ Wellness profiles sync from CarePeers
7. ✅ Trips can be created and tracked
8. ✅ Milestones reported back to platform

---

## 📞 Support

For issues or questions:
- Check logs: `journalctl -u active-living-lab` (systemd) or container logs
- Review documentation in this repository
- Test with MCP Inspector: `npx @modelcontextprotocol/inspector`
- Verify database connectivity: `psql $DATABASE_URL -c "SELECT 1"`

---

**Next Steps**: Complete Step 1 (Deploy Active Living Lab) and proceed with Steps 2-3.

**Last Updated**: January 6, 2026
**Status**: ✅ Ready for deployment
