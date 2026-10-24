import { mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url)), build = await mkdtemp(join(tmpdir(), 'solar-firmware-'));
try {
  await copyFile(join(root, 'firmware/solar_monitor/solar_monitor.ino'), join(build, 'solar_monitor.ino'));
  await copyFile(join(root, 'tests/firmware/harness.cpp'), join(build, 'harness.cpp'));
  let config = await readFile(join(root, 'firmware/solar_monitor/config.example.h'), 'utf8');
  config = config.replace('replace-with-at-least-32-random-characters', 'a'.repeat(64));
  await writeFile(join(build, 'config.h'), config);
  const executable = join(build, process.platform === 'win32' ? 'firmware-test.exe' : 'firmware-test');
  const result = spawnSync(process.env.CXX || 'g++', ['-std=c++17', '-Wall', '-Wextra', '-I', join(root, 'tests/firmware/stubs'), join(build, 'harness.cpp'), '-o', executable], { encoding: 'utf8' });
  if (result.error) throw new Error('Host firmware tests need a C++17 compiler (g++ or CXX). Use Arduino Verify for the actual ESP32 build.');
  if (result.status !== 0) throw new Error(result.stderr);
  const run = spawnSync(executable, [], { encoding: 'utf8' }); process.stdout.write(run.stdout); if (run.status !== 0) throw new Error(run.stderr || 'Firmware assertions failed.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await rm(build, { recursive: true, force: true }); }
