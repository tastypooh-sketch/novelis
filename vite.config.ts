import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // FIX: Cast process to any to avoid TS error about cwd() missing in some environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: process.env.NODE_ENV === 'production' ? './' : '/', // Use root base in dev for proper module resolution
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        external: ['electron'],
      },
    },
    optimizeDeps: {
      include: ['framer-motion'],
    },
  };
});