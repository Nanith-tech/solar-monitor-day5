import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const children = new Set(); let closing = false, clientStarted = false;
function stop(code = 0) {
  if (closing) return; closing = true; process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  const deadline = setTimeout(() => { for (const child of children) child.kill('SIGKILL'); }, 10000); deadline.unref();
}
function start(file, cwd, onOutput, args = []) {
  const child = spawn(process.execPath, [file, ...args], { cwd, stdio: ['inherit', 'pipe', 'pipe'] }); children.add(child);
  child.stdout.on('data', bytes => { process.stdout.write(bytes); onOutput?.(bytes.toString()); });
  child.stderr.on('data', bytes => process.stderr.write(bytes));
  child.on('error', () => { console.error('Could not start a process. Run npm ci in the root folder.'); stop(1); });
  child.on('exit', (code) => { children.delete(child); if (!closing) stop(code || 1); });
  return child;
}
start(fileURLToPath(new URL(process.argv.includes('--wifi-setup') ? './wifi-setup-server.mjs' : '../server/src/server.js', import.meta.url)), root, output => {
  if (!closing && !clientStarted && output.includes('Solar API listening on')) {
    clientStarted = true;
    start(fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), fileURLToPath(new URL('../client/', import.meta.url)), undefined, ['--host','127.0.0.1','--strictPort']);
  }
});
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
console.log('Starting backend, then React. Ctrl+C stops both. Do not also run npm start/npm run client.');
