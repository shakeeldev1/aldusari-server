import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function getJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? getJavaScriptFiles(path) : entry.isFile() && entry.name.endsWith('.js') ? [path] : [];
  });
}

const files = getJavaScriptFiles(fileURLToPath(new URL('../', import.meta.url)));
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}

if (failed) process.exitCode = 1;
else console.log(`Server build check passed (${files.length} JavaScript files).`);
