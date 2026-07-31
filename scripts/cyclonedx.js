/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
// Generates the version-stamped CycloneDX SBOM via @cyclonedx/bom's cyclonedx-node CLI.
// Stays on @cyclonedx/bom@3 on purpose: @cyclonedx/cyclonedx-npm pulls a native node-gyp/libxmljs2
// chain (critical + highs) and needs Node >=20.18 — worse than v3's two dev-only moderates.
const fs = require('fs');
const { execFileSync } = require('child_process');

const version = JSON.parse(fs.readFileSync('package.json').toString()).version;
const output = `sonarlint-vscode-${version}.sbom-cyclonedx.json`;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

execFileSync(npm, ['run', 'cyclonedx-run', '--', '--output', output], { stdio: 'inherit' });
