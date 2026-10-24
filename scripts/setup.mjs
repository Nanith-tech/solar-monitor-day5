import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const target = new URL('../server/.env', import.meta.url);
const template = await readFile(new URL('../server/.env.example', import.meta.url), 'utf8');
try {
  await writeFile(target, template.replace('replace-with-at-least-32-random-characters', randomBytes(32).toString('hex')), { flag: 'wx', mode: 0o600 });
  console.log('Created server/.env with a random device key. Edit MongoDB/Wi-Fi-related settings as needed.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('server/.env already exists; left it unchanged.');
}
