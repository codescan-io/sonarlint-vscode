'use strict';
const fs = require('fs');
const crypto = require('crypto');
const request = require('request');

if (!fs.existsSync('server')){
    fs.mkdirSync('server');
}

if (!fs.existsSync('analyzers')){
    fs.mkdirSync('analyzers');
}
downloadIfNeeded('/home/ben/dev/apex-scan/sonarlint-core/language-server/target/sonarlint-language-server-3.0.1-CODESCAN4.jar', 'server/sonarlint-ls.jar');

function downloadIfNeeded(url, dest) {
    if (!fs.existsSync(dest)) {
	fs.writeFileSync(dest, fs.readFileSync(url));
    }
}

