/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
// Generates the CycloneDX SBOM with a version-stamped filename.
// Replaces the former gulp 'cycloneDx' task (gulp was removed). Mirrors its behaviour:
// `npm run cyclonedx-run -- --output sonarlint-vscode-<version>.sbom-cyclonedx.json`.
const fs = require('fs');
const { execFileSync } = require('child_process');

const version = JSON.parse(fs.readFileSync('package.json').toString()).version;
const output = `sonarlint-vscode-${version}.sbom-cyclonedx.json`;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

execFileSync(npm, ['run', 'cyclonedx-run', '--', '--output', output], { stdio: 'inherit' });
