'use strict';
const fs = require('fs');
const crypto = require('crypto');
const request = require('request');

const languageServerVersion = '4.2.0.CODESCAN';

if (!fs.existsSync('server')) {
  fs.mkdirSync('server');
}

if (!fs.existsSync('analyzers')) {
  fs.mkdirSync('analyzers');
}

function copy(url, dest) {
    fs.writeFileSync(dest, fs.readFileSync(url));
}
copy(`../sonarlint-core/language-server/target/sonarlint-language-server-${languageServerVersion}.jar`, 'server/sonarlint-ls.jar');

