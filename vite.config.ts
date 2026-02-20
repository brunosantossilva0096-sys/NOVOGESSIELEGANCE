import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const ASAAS_TOKEN = 'cb44adc0-3e19-4e11-b8e6-7c1a378642da';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Proxy local para Asaas — resolve CORS em desenvolvimento
        // /api/asaas/customers → https://api.asaas.com/v3/customers
        '/api/asaas': {
          target: 'https://api.asaas.com/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/asaas/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('access_token', ASAAS_TOKEN);
              proxyReq.setHeader('User-Agent', 'GessiElegance/1.0');
            });
          },
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
