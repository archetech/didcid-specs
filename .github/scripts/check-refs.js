#!/usr/bin/env node
// Turn spec-up's advisory stdout into a real build failure.
//
// spec-up always exits 0. It prints "Unresolved References:  [ 'A', 'B' ]"
// (console.log of an array, which node may wrap over several lines) for every
// [[ref: X]] with no matching [[def: X]]. Names that match an external_specs
// key in specs.json are satisfied by the external link and are expected;
// anything else renders as a dead link and should fail CI.
//
// Usage: node .github/scripts/check-refs.js <render.log>

const fs = require('fs');
const path = require('path');

const logPath = process.argv[2] || 'render.log';
const specsPath = path.join(__dirname, '..', '..', 'specs.json');

const log = fs.readFileSync(logPath, 'utf8');
const block = log.match(/Unresolved References:\s*\[([\s\S]*?)\]/);
if (!block) {
  console.log('No unresolved references.');
  process.exit(0);
}

const refs = [...block[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
const external = new Set(
  JSON.parse(fs.readFileSync(specsPath, 'utf8')).specs.flatMap((spec) =>
    (spec.external_specs || []).flatMap((entry) => Object.keys(entry))
  )
);

const broken = refs.filter((ref) => !external.has(ref));
if (broken.length) {
  console.log(
    `::error::Unresolved references with no local [[def:]]: ${broken.join(', ')}`
  );
  process.exit(1);
}

console.log(`Unresolved references are all external specs: ${refs.join(', ')}`);
