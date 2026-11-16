import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = import.meta.dirname;

export default defineConfig({
  plugins: [{
    name: 'copy-legacy-pos',
    apply: 'build',
    closeBundle() {
      const outputDirectory = resolve(projectRoot, 'dist');
      mkdirSync(outputDirectory, { recursive: true });
      copyFileSync(resolve(projectRoot, 'PosLaundry.html'), resolve(outputDirectory, 'PosLaundry.html'));
    }
  }],
  build: {
    rollupOptions: {
      input: {
        pos: resolve(projectRoot, 'pos.html'),
        admin: resolve(projectRoot, 'admin.html'),
        agen: resolve(projectRoot, 'agen.html')
      }
    }
  }
});
