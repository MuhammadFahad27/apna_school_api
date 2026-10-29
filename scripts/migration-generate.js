import { execSync } from 'node:child_process';

let name = 'migration';
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith('--name=')) {
    name = arg.split('=')[1];
  } else if (arg === '--name' && process.argv[i + 1]) {
    name = process.argv[++i];
  } else if (!arg.startsWith('-')) {
    name = arg;
  }
}

name = name.replace(/^src[\\/]database[\\/]migrations[\\/]/, '').replace(/\.ts$/, '');
const target = `src/database/migrations/${name}`;

try {
  execSync(`npm run build`, { stdio: 'inherit' });
  execSync(`npx typeorm migration:generate ${target} -d dist/database/data-source.js`, { stdio: 'inherit' });
} catch {
  process.exit(1);
}
