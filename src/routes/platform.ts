/**
 * CloudPeers Platform Integration Routes
 *
 * Handles activation requests from CloudPeers Platform
 * and integrates with CarePeers wellness profiles
 */

import express, { Router, Request, Response } from 'express';
import {
  LabRegistryService,
  CloudPeersPlatformIntegration,
} from '../mcp/lab-registry';
import { TravelRepository } from '../database/repository';

export function createPlatformRouter(databaseUrl?: string): Router {
  const router = express.Router();

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', service: 'active-living-lab' });
  });

  // Lab discovery endpoint
  router.get('/lab/info', async (_req: Request, res: Response) => {
    try {
      const repository = databaseUrl ? new TravelRepository(databaseUrl) : null;
      const labRegistry = new LabRegistryService(repository as any);

      const labInfo = labRegistry.getLabInfo();
      res.json(labInfo);
    } catch (error: any) {
      console.error('Error getting lab info:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Lab capabilities endpoint
  router.get('/lab/capabilities', async (_req: Request, res: Response) => {
    try {
      const repository = databaseUrl ? new TravelRepository(databaseUrl) : null;
      const labRegistry = new LabRegistryService(repository as any);

      const capabilities = labRegistry.getCapabilities();
      res.json(capabilities);
    } catch (error: any) {
      console.error('Error getting lab capabilities:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Lab manifest export (for CloudPeers Platform discovery)
  router.get('/lab/manifest', async (_req: Request, res: Response) => {
    try {
      const repository = databaseUrl ? new TravelRepository(databaseUrl) : null;
      const labRegistry = new LabRegistryService(repository as any);

      const manifest = labRegistry.exportManifest();
      res.json(manifest);
    } catch (error: any) {
      console.error('Error exporting manifest:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Onboarding flow endpoint
  router.get('/lab/onboarding', async (_req: Request, res: Response) => {
    try {
      const repository = databaseUrl ? new TravelRepository(databaseUrl) : null;
      const labRegistry = new LabRegistryService(repository as any);

      const onboarding = labRegistry.getOnboardingFlow();
      res.json(onboarding);
    } catch (error: any) {
      console.error('Error getting onboarding flow:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Platform activation endpoint
  router.post('/activate', async (req: Request, res: Response) => {
    try {
      const { userId, sessionId, selectedOutcome, selectedImportance, returnUrl } =
        req.body;

      // Validate required fields
      if (!userId || !sessionId || !selectedOutcome) {
        return res.status(400).json({
          error: 'Missing required fields: userId, sessionId, selectedOutcome',
        });
      }

      // Create lab registry and platform integration
      const repository = databaseUrl ? new TravelRepository(databaseUrl) : null;
      const labRegistry = new LabRegistryService(repository as any);
      const platformIntegration = new CloudPeersPlatformIntegration(labRegistry);

      // Handle platform activation
      const result = await platformIntegration.handlePlatformActivation({
        userId,
        sessionId,
        selectedOutcome,
        selectedImportance: selectedImportance || 3,
        returnUrl,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('Error handling platform activation:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Milestone reporting endpoint (for Active Living Lab → CloudPeers Platform)
  router.post('/report-milestone', async (req: Request, res: Response) => {
    try {
      const { userId, tripId, type, data } = req.body;

      // Validate required fields
      if (!userId || !tripId || !type) {
        return res.status(400).json({
          error: 'Missing required fields: userId, tripId, type',
        });
      }

      // Create platform integration
      const repository = databaseUrl ? new TravelRepository(databaseUrl) : null;
      const labRegistry = new LabRegistryService(repository as any);
      const platformIntegration = new CloudPeersPlatformIntegration(labRegistry);

      // Report milestone
      await platformIntegration.reportMilestone({
        userId,
        tripId,
        type,
        data,
      });

      res.json({
        success: true,
        message: 'Milestone reported successfully',
      });
    } catch (error: any) {
      console.error('Error reporting milestone:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}

export default createPlatformRouter;
