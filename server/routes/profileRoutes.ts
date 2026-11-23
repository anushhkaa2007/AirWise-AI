import { Router } from 'express';
import {
  getUserProfile,
  saveUserProfile,
  updateActiveLocation,
} from '../services/profileService.ts';

export const profileRouter = Router();

profileRouter.get('/', async (_req, res) => {
  const profile = await getUserProfile();
  res.json({ profile });
});

profileRouter.put('/', async (req, res) => {
  const result = await saveUserProfile(req.body ?? {});
  if (!result.ok) {
    res.status(400).json({ error: 'Invalid profile fields', errors: result.errors });
    return;
  }
  res.json({ profile: result.profile });
});

profileRouter.patch('/location', async (req, res) => {
  const location = typeof req.body?.location === 'string' ? req.body.location : '';
  const profile = await updateActiveLocation(location);
  res.json({ profile });
});
