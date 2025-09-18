'use strict';
const fs = require('fs');

const languageServerVersion = '2.20.3-CODESCAN';
console.info("Copying language server jar version: " + languageServerVersion);

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
console.info("Language server jar copied successfully!");