const { spawnSync } = require('node:child_process');
const path = require('node:path');

const jestArgs = process.argv.slice(2);
const hasIntSpec = jestArgs.some((arg) => arg.includes('.int-spec.ts'));
const hasExplicitConfig =
  jestArgs.includes('--config') ||
  jestArgs.includes('-c') ||
  jestArgs.some((arg) => arg.startsWith('--config='));
const integrationConfigPath = path.resolve(__dirname, 'jest-integration.json');

const args = hasIntSpec && !hasExplicitConfig
  ? ['--config', integrationConfigPath, ...jestArgs]
  : [...jestArgs];

const jestBin = require.resolve('jest/bin/jest');
const result = spawnSync(process.execPath, [jestBin, ...args], {
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
