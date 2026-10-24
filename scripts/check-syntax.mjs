import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && !['node_modules', 'dist'].includes(entry.name)) await visit(file);
    if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
      count++;
    }
  }
}
await visit(path.join(root, 'server'));
await visit(path.join(root, 'scripts'));
await visit(path.join(root, 'client'));
console.log(`JavaScript syntax passed for ${count} source/test/script files.`);
