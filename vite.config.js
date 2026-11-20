import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = import.meta.dirname;
const outputDirectory = resolve(projectRoot, 'dist');

export default defineConfig({
  root: projectRoot,
  plugins: [{
    name: 'copy-laundry-runtime',
    apply: 'build',
    closeBundle() {
      mkdirSync(outputDirectory, { recursive: true });
      ['poslaundry.html', 'offline-sync.js', 'order-lists.js', 'service-worker.js'].forEach(file => {
        copyFileSync(resolve(projectRoot, file), resolve(outputDirectory, file));
      });
    }
  }],
  build: {
    outDir: outputDirectory,
    rollupOptions: {
      input: {
        index: resolve(projectRoot, 'index.html'),
        pos: resolve(projectRoot, 'pos.html'),
        admin: resolve(projectRoot, 'admin.html'),
        agen: resolve(projectRoot, 'agen.html')
      }
    }
  }
});
