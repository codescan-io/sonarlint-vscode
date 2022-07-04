/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2022 SonarSource SA
 * sonarlint@sonarsource.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
const fs = require('fs');
const languageServerVersion = '2.2-CODESCAN';

if (!fs.existsSync('server')) {
  fs.mkdirSync('server');
}

if (!fs.existsSync('analyzers')) {
  fs.mkdirSync('analyzers');
}

function copy(url, dest) {
  fs.writeFileSync(dest, fs.readFileSync(url));
}
copy(`../sonarlint-language-server/target/sonarlint-language-server-${languageServerVersion}.jar`, 'server/sonarlint-ls.jar');