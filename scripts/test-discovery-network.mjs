import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const child = spawn(process.execPath, ['--test', 'tests/discovery.test.js'], { cwd: fileURLToPath(new URL('../server/', import.meta.url)), env: { ...process.env, SOLAR_TEST_MDNS: 'true' }, stdio: 'inherit' });
const deadline = setTimeout(() => { console.error('Multicast test timed out. Check network/firewall and test on the actual hotspot.'); child.kill('SIGKILL'); }, 15000);
child.on('exit', code => { clearTimeout(deadline); process.exitCode = code === 0 ? 0 : 1; });
