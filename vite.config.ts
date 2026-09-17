import { defineConfig, loadEnv } from 'vite';
import { createPhotoDemoMiddleware } from './src/server/photo/demoMiddleware.js';
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  if (environment.OPENAI_API_KEY) process.env.OPENAI_API_KEY = environment.OPENAI_API_KEY;
  return { base: './', publicDir: 'example', plugins: [{ name: 'lookatme-photo-demo', configureServer(server) { server.middlewares.use(createPhotoDemoMiddleware()); } }] };
});
