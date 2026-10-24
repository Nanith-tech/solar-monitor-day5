import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.SOLAR_API_TARGET || 'http://127.0.0.1:4000';
  const proxy = { '/api': { target, changeOrigin: true }, '/socket.io': { target, changeOrigin: true, ws: true } };
  return { server: { proxy }, preview: { proxy } };
});
