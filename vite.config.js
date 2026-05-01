import { defineConfig } from 'vite';

// Base path adapté au déploiement GitHub Pages sur le repo Simu_LMNP.
export default defineConfig({
  base: '/Simu_LMNP/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
