import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/api.ts';
import { adminRouter } from './server/routes/admin.ts';
import { botRouter } from './server/routes/bot.ts';
import { db } from './server/db.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS / Security headers for Telegram iframe
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow Telegram Mini App webview
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data, X-Telegram-Id, X-Admin-Key, X-Bot-Token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    const raw = db.getRawData();
    res.json({
      status: 'ok',
      usersCount: raw.users.length,
      ordersCount: raw.orders.length,
      depositsCount: raw.deposits.length,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // SSE real-time updates channel
  const sseClients = new Set<express.Response>();

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Broadcast helper
  (global as any).broadcastEvent = (event: { type: string; data?: any }) => {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    sseClients.forEach((client) => {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    });
  };

  // Mount API Routers
  app.use('/api', apiRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/bot', botRouter);

  // Unmatched API endpoint 404 handler (always JSON)
  app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Vite middleware in dev mode / static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Central Telegram Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
