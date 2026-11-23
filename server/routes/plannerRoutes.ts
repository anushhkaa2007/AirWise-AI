import { Router } from 'express';
import { getDailyPlanner } from '../services/plannerService.ts';
import { getUserProfile } from '../services/profileService.ts';

export const plannerRouter = Router();

plannerRouter.get('/', async (req, res) => {
  try {
    const profile = await getUserProfile();
    const locationParam =
      typeof req.query.location === 'string' ? req.query.location.trim() : undefined;
    const bypassCache = req.query.refresh === '1' || req.query.refresh === 'true';

    const bundle = await getDailyPlanner(profile, {
      locationOverride: locationParam !== undefined ? locationParam : undefined,
      bypassCache,
    });

    res.json(bundle);
  } catch (error) {
    console.error('Error building daily planner:', error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Unable to generate daily planner right now.',
    });
  }
});
