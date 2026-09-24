const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

async function copy(source, destination) {
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    for (const item of await fs.readdir(source))
      await copy(path.join(source, item), path.join(destination, item));
  } else {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }
}

(async () => {
  const root = path.resolve(__dirname, '../..'),
    payload = path.join(root, 'desktop/payload');
  await fs.mkdir(path.join(payload, 'backend'), { recursive: true });

  // Copy backend source, migrations, and lock file
  for (const name of ['src', 'database/migrations', 'package.json', 'package-lock.json'])
    await copy(path.join(root, 'backend', name), path.join(payload, 'backend', name));

  // Install production dependencies (express, bcrypt, zod, jsonwebtoken, helmet, pg, …)
  // into payload/backend/node_modules so the packaged app needs no internet connection.
  console.log('Installing backend production dependencies into payload…');
  execFileSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['ci', '--omit=dev', '--prefer-offline'],
    { cwd: path.join(payload, 'backend'), stdio: 'inherit' }
  );

  // Copy built frontend and shared types
  await copy(path.join(root, 'frontend/dist'), path.join(payload, 'frontend/dist'));
  await copy(path.join(root, 'shared'), path.join(payload, 'shared'));

  console.log('Staged application source, assets, and backend node_modules. No .env, shop records or development seed data copied.');
})().catch(e => { console.error(e); process.exitCode = 1; });

