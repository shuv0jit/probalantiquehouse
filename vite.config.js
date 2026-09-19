import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Load .env exactly like `node --env-file=.env` does, but let the file WIN over
 * stale shell variables and over values Vite cached before an auto-restart.
 */
function loadDotEnv() {
  try {
    const file = path.resolve(process.cwd(), '.env');
    Object.assign(process.env, parseEnv(fs.readFileSync(file, 'utf8')));
    const t = process.env.CF_API_TOKEN || '';
    console.log(`[env] D1 token ${t.slice(0, 8)}… (${t.length} chars), account ${process.env.CF_ACCOUNT_ID}`);
  } catch (err) {
    console.error('[env] could not read .env:', err.message);
  }
}

function apiInDev() {
  return {
    name: 'pah-api-dev',
    async configureServer(server) {
      loadDotEnv();
      const { app } = await import('./server/app.js');
      server.middlewares.use(app);
    },
  };
}

export default defineConfig({
  plugins: [react(), apiInDev()],
  server: { port: 5173 },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});