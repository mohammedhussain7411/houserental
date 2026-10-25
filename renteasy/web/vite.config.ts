import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { renteasySyncPlugin } from './vite-sync-plugin';

const isGHPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGHPages ? '/FHGControl/' : './',
  plugins: [react(), ...(isGHPages ? [] : [renteasySyncPlugin()])],
  server: {
    host: true,
    port: 5174,
    open: false
  }
});

