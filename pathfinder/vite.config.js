import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleNova } from './api/_lib/nova.js';

// `npm run dev` serves POST /api/nova from the same code as the Vercel function, using NOVA_API_KEY from
// .env.local (git-ignored) or the shell. It is dev-only: the production build has no key and no server code.
function novaDevApi(mode) {
  return {
    name: 'nova-dev-api',
    apply: 'serve',
    configureServer(server) {
      const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
      server.middlewares.use('/api/nova', async (req, res) => {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body = null;
        try {
          body = JSON.parse(raw);
        } catch {
          /* handled as a bad request */
        }
        const out = await handleNova({ method: req.method, body, ip: req.socket.remoteAddress ?? '', env });
        res.statusCode = out.status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(out.body));
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), novaDevApi(mode)],
  test: { environment: 'node' },
}));
