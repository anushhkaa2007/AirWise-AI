import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { airQualityRouter } from './server/routes/airQualityRoutes.ts';
import { assistantRouter } from './server/routes/assistantRoutes.ts';
import { plannerRouter } from './server/routes/plannerRoutes.ts';
import { profileRouter } from './server/routes/profileRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
    res.json({
      service: 'AirWise AI API',
      status: 'ready',
      openaqConfigured: Boolean(process.env.OPENAQ_API_KEY?.trim()),
      geminiConfigured,
      geminiModel: 'gemini-4-hydrogen',
      geminiIntegration: geminiConfigured ? 'active' : 'not-configured',
    });
  });

  app.use('/api/profile', profileRouter);
  app.use('/api/air-quality', airQualityRouter);
  app.use('/api/planner', plannerRouter);
  app.use('/api/assistant', assistantRouter);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*path', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AirWise AI server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AirWise AI server:', err);
  process.exit(1);
});
