'use strict';
const fs = require('fs');

console.log("Copying language server jar....")
const languageServerVersion = '2.20.3-CODESCAN';

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
console.log("Language server jar copied successfully!")
