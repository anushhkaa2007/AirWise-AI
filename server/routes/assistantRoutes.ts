import { Router } from 'express';
import { processAssistantMessage } from '../services/geminiAssistantService.ts';
import { getUserProfile } from '../services/profileService.ts';
import type { ConversationTurn } from '../../src/utils/geminiPromptLogic.ts';

export const assistantRouter = Router();

function sanitizeHistory(raw: unknown): ConversationTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ConversationTurn[] = [];
  for (const item of raw.slice(-6)) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (
      (role === 'user' || role === 'assistant') &&
      typeof content === 'string' &&
      content.trim().length > 0
    ) {
      turns.push({
        role,
        content: content.trim().slice(0, 800),
      });
    }
  }
  return turns;
}

assistantRouter.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    res.status(400).json({ error: 'Please enter a question for AirWise AI.' });
    return;
  }

  if (message.length > 1000) {
    res.status(400).json({ error: 'Message must be 1,000 characters or fewer.' });
    return;
  }

  const locationOverride =
    typeof req.body?.location === 'string' ? req.body.location.trim().slice(0, 100) : undefined;
  const liveFetchFailed = req.body?.liveFetchFailed === true;
  const history = sanitizeHistory(req.body?.history);

  try {
    const profile = await getUserProfile();
    const result = await processAssistantMessage({
      question: message,
      profile,
      locationOverride,
      history,
      liveFetchFailed,
    });

    res.json(result);
  } catch (error) {
    const messageText =
      error instanceof Error
        ? error.message
        : 'Unable to process assistant request right now.';
    res.status(500).json({ error: messageText });
  }
});
