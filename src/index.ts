/**
 * Active Living Lab Service
 * Entry point for the Express API server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { TravelExperienceAgent } from './agents/travel-experience-agent';
import { CarePeersMCPClient } from './integrations/carepeers-mcp-client';
import { createPlatformRouter } from './routes/platform';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize database pool (if DATABASE_URL provided)
let pool: Pool | undefined;
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const carepeersClient = new CarePeersMCPClient(
  process.env.CAREPEERS_MCP_URL || 'http://localhost:3001/mcp',
  process.env.CAREPEERS_API_KEY || ''
);

const travelAgent = new TravelExperienceAgent();

// ============================================================================
// ROUTES
// ============================================================================

// Mount CloudPeers Platform integration routes
app.use('/api/platform', createPlatformRouter(databaseUrl));

/**
 * Root welcome page
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Active Living Lab',
    version: '0.1.0',
    description: 'Agent-operated premium travel service for active retirees',
    status: 'online',
    endpoints: {
      health: '/health',
      platform: {
        info: '/api/platform/lab/info',
        capabilities: '/api/platform/lab/capabilities',
        manifest: '/api/platform/lab/manifest',
        onboarding: '/api/platform/lab/onboarding',
        activate: 'POST /api/platform/activate',
        reportMilestone: 'POST /api/platform/report-milestone',
      },
      travel: {
        wellness: '/api/wellness/:userId',
        analyzeDay: 'POST /api/analyze-day',
        wellnessLog: 'POST /api/wellness/:userId/log',
        activityRecommendations: '/api/wellness/:userId/activity-recommendations/:type',
      },
    },
    integration: {
      cloudPeersPlatform: process.env.CLOUDPEERS_PLATFORM_URL || 'Not configured',
      carePeersMCP: process.env.CAREPEERS_MCP_URL || 'http://localhost:3001/mcp',
      database: pool ? 'Connected' : 'Not configured',
    },
    documentation: 'https://github.com/cloudpeers/active-living-lab',
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'active-living-lab',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get wellness profile for a user (via CarePeers MCP)
 */
app.get('/api/wellness/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await carepeersClient.getWellnessProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Analyze daily itinerary with Travel Experience Agent
 */
app.post('/api/analyze-day', async (req, res) => {
  try {
    const context = req.body;

    // Validate required fields
    if (!context.tripId || !context.userId || !context.date || !context.currentItinerary) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tripId, userId, date, currentItinerary',
      });
    }

    // Optionally fetch wellness profile if not provided
    if (!context.wellnessProfile) {
      try {
        context.wellnessProfile = await carepeersClient.getWellnessProfile(context.userId);
      } catch (error) {
        console.warn('Could not fetch wellness profile, proceeding without it');
      }
    }

    // Run Travel Experience Agent analysis
    const recommendation = await travelAgent.analyze(context);

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error: any) {
    console.error('TXA analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Update wellness log from travel activity
 */
app.post('/api/wellness/:userId/log', async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, sleep, movement, stress, nutrition } = req.body;

    await carepeersClient.updateWellnessLog(userId, date, {
      sleep,
      movement,
      stress,
      nutrition,
    });

    res.json({
      success: true,
      message: 'Wellness log updated',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get activity recommendations based on wellness profile
 */
app.get('/api/wellness/:userId/activity-recommendations/:activityType', async (req, res) => {
  try {
    const { userId, activityType } = req.params;
    const recommendations = await carepeersClient.getActivityRecommendations(
      userId,
      activityType
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Active Living Lab                                        ║
║  Premium travel for active retirees with AI agents        ║
╚═══════════════════════════════════════════════════════════╝

🚀 Server running on port ${PORT}
🏥 CarePeers MCP: ${process.env.CAREPEERS_MCP_URL || 'http://localhost:3001/mcp'}
🌐 CloudPeers Platform: ${process.env.CLOUDPEERS_PLATFORM_URL || 'Not configured'}
📊 Database: ${pool ? 'Connected' : 'Not configured'}
📅 Ready to orchestrate premium travel experiences for active retirees

Available endpoints:
  GET  /health - Service health check

  Platform Integration:
  GET  /api/platform/lab/info - Lab discovery
  GET  /api/platform/lab/capabilities - Lab capabilities
  GET  /api/platform/lab/manifest - Full manifest
  POST /api/platform/activate - Handle platform activation
  POST /api/platform/report-milestone - Report milestones

  Travel Services:
  GET  /api/wellness/:userId - Get wellness profile
  POST /api/analyze-day - Analyze daily itinerary with TXA
  POST /api/wellness/:userId/log - Update wellness log
  GET  /api/wellness/:userId/activity-recommendations/:type
  `);
});

export default app;
