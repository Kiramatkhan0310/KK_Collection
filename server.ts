import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter, authenticateToken } from './src/server/api.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Body Parsing & Auth Token extraction
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(authenticateToken);

  // Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Mount API Router under /api
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      store: 'KK Collection',
      timestamp: new Date().toISOString()
    });
  });

  // Serve static public and asset directories
  app.use(express.static(path.resolve(__dirname, 'public')));
  app.use('/src/assets', express.static(path.resolve(__dirname, 'src/assets')));

  if (!isProd) {
    // Development mode: Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KK Collection API Server] Running on http://0.0.0.0:${PORT} (${isProd ? 'Production' : 'Development'})`);
  });
}

startServer().catch((err) => {
  console.error('[KK Collection Server] Fatal startup error:', err);
  process.exit(1);
});
