/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
// Removes build outputs and any local .vsix. Replaces the former gulp 'clean' task (gulp removed).
const fs = require('fs');

for (const dir of ['server', 'out', 'out-cov']) {
  fs.rmSync(dir, { recursive: true, force: true });
}
for (const entry of fs.readdirSync('.')) {
  if (entry.endsWith('.vsix')) {
    fs.rmSync(entry, { force: true });
  }
}
console.log('clean: removed server/, out/, out-cov/ and *.vsix');
