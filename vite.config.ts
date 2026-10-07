import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const root = process.cwd();
const serviceWorkerTemplatePath = resolve(root, 'scripts/service-worker.template.js');

function sourceFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(path, entry.name);
    return entry.isDirectory() ? sourceFiles(fullPath) : [fullPath];
  });
}

function buildIdentity(mode: string, base: string): string {
  const inputs = [
    resolve(root, 'index.html'),
    resolve(root, 'package.json'),
    resolve(root, 'package-lock.json'),
    resolve(root, 'vite.config.ts'),
    ...['src', 'public'].flatMap((directory) => sourceFiles(resolve(root, directory))),
    serviceWorkerTemplatePath,
  ].sort();
  const hash = createHash('sha256').update(mode).update(base);
  for (const input of inputs) hash.update(relative(root, input)).update(readFileSync(input));
  return hash.digest('hex').slice(0, 16);
}

function serviceWorkerPlugin(mode: string, base: string): Plugin {
  const id = buildIdentity(mode, base);
  const template = readFileSync(serviceWorkerTemplatePath, 'utf8');
  const renderServiceWorker = () => template.replaceAll('__FLOWMUSIC_BUILD_ID__', id);
  return {
    name: 'flowmusic-versioned-service-worker',
    configureServer(server) {
      const workerPath = base + 'sw.js';
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== workerPath) return next();
        response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        response.setHeader('Service-Worker-Allowed', base);
        response.end(renderServiceWorker());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: renderServiceWorker() });
    },
  };
}

export default defineConfig(({ mode }) => {
  const base = mode === 'pages' ? '/flowmusic-prompt-generator/' : '/';
  return {
    base,
    plugins: [serviceWorkerPlugin(mode, base)],
    build: {
      target: 'es2022',
      sourcemap: true,
      rollupOptions: { input: [resolve(root, 'index.html'), resolve(root, 'audio-preview-review.html')] },
    },
  };
});
