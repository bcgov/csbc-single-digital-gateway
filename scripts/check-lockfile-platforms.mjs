#!/usr/bin/env node
// Validates that package-lock.json contains resolved entries for all platform
// variants needed by Docker (Alpine = linux-x64-musl). Without these entries,
// `npm install` inside the Alpine container silently skips the native binaries
// and the build fails at runtime. See npm bug #4828.

import { readFileSync } from 'node:fs';

const REQUIRED_TARGETS = [
  { os: 'linux', cpu: 'x64', libc: 'musl', suffix: 'linux-x64-musl' },
  { os: 'linux', cpu: 'x64', libc: 'glibc', suffix: 'linux-x64-gnu' },
];

const lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const packages = lockfile.packages ?? {};

// Find parent packages whose optionalDependencies include platform-specific
// native binaries (they list variants like `<name>-linux-x64-musl`).
const parents = Object.entries(packages).filter(
  ([, meta]) =>
    meta.optionalDependencies &&
    Object.keys(meta.optionalDependencies).some((dep) =>
      REQUIRED_TARGETS.some((t) => dep.endsWith(t.suffix)),
    ),
);

let missing = [];

for (const [parentKey, parentMeta] of parents) {
  const parentName = parentMeta.name ?? parentKey.replace(/^node_modules\//, '');

  for (const depName of Object.keys(parentMeta.optionalDependencies)) {
    for (const target of REQUIRED_TARGETS) {
      if (!depName.endsWith(target.suffix)) continue;

      const entryKey = `node_modules/${depName}`;
      if (!packages[entryKey]) {
        missing.push({ parent: parentName, dep: depName, target: target.suffix });
      }
    }
  }
}

if (missing.length > 0) {
  console.error(
    '\x1b[31m✗ Missing lockfile entries for Docker (Alpine linux-x64-musl/gnu):\x1b[0m\n',
  );
  for (const m of missing) {
    console.error(`  - ${m.dep}  (required by ${m.parent})`);
  }
  console.error(
    '\n  Run: \x1b[1mnpm run fix:lockfile\x1b[0m\n' +
      '  See: https://github.com/npm/cli/issues/4828\n',
  );
  process.exit(1);
}

console.log(`✓ Lockfile has cross-platform entries for ${parents.length} native package(s).`);
