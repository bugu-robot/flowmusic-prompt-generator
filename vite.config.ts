import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/flowmusic-prompt-generator/' : '/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
