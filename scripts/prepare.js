'use strict';
const fs = require('fs');
const crypto = require('crypto');
const request = require('request');

const languageServerVersion = '3.9-SNAPSHOT';

if (!fs.existsSync('server')) {
  fs.mkdirSync('server');
}

if (!fs.existsSync('analyzers')) {
  fs.mkdirSync('analyzers');
}

function copyIfNeeded(url, dest) {
    if (!fs.existsSync(dest)) {
	fs.writeFileSync(dest, fs.readFileSync(url));
    }
}
copyIfNeeded(`/home/ben/dev/apex-scan/sonarlint-core/language-server/target/sonarlint-language-server-${languageServerVersion}.jar`, 'server/sonarlint-ls.jar');


