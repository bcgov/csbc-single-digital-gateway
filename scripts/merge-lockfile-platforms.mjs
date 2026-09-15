#!/usr/bin/env node
// Merges missing platform-specific optional dependency entries from a donor
// lockfile (generated on Alpine) into the original lockfile.
//
// Only copies entries that:
//   1. Have os/cpu/libc constraints (platform-specific native binaries)
//   2. Don't already exist in the original lockfile
//   3. Are listed as optionalDependencies of a parent that IS in the original

import { readFileSync, writeFileSync } from 'node:fs';

const [, , origPath, donorPath, outPath] = process.argv;
if (!origPath || !donorPath) {
  console.error('Usage: node merge-lockfile-platforms.mjs <original> <donor> [output]');
  process.exit(1);
}

const orig = JSON.parse(readFileSync(origPath, 'utf8'));
const donor = JSON.parse(readFileSync(donorPath, 'utf8'));

const origPkgs = orig.packages;
const donorPkgs = donor.packages;

let added = 0;

for (const [key, meta] of Object.entries(donorPkgs)) {
  // Skip if already in original
  if (origPkgs[key]) continue;

  // Only platform-specific packages (have os or cpu or libc constraints)
  if (!meta.os && !meta.cpu && !meta.libc) continue;

  // Check that a parent in the original lists this as an optionalDependency
  const pkgName = key.replace(/^node_modules\//, '');
  let isOptionalOfParent = false;

  for (const [, parentMeta] of Object.entries(origPkgs)) {
    if (parentMeta.optionalDependencies?.[pkgName]) {
      isOptionalOfParent = true;
      break;
    }
  }

  if (!isOptionalOfParent) continue;

  origPkgs[key] = meta;
  added++;
  console.log(`  + ${key}`);

  // Also copy any nested deps of this package (e.g. wasm fallback deps)
  const nestedPrefix = key + '/node_modules/';
  for (const [nestedKey, nestedMeta] of Object.entries(donorPkgs)) {
    if (nestedKey.startsWith(nestedPrefix) && !origPkgs[nestedKey]) {
      origPkgs[nestedKey] = nestedMeta;
      added++;
      console.log(`  + ${nestedKey} (nested)`);
    }
  }
}

const output = outPath || origPath;
writeFileSync(output, JSON.stringify(orig, null, 2) + '\n');
console.log(`\nAdded ${added} platform entries. Written to ${output}`);
