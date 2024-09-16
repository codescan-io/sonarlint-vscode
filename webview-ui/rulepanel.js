/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

const vscode = acquireVsCodeApi();

window.addEventListener('load', init);
window.addEventListener('message', handleMessage);

function byId(elementId) {
  return document.getElementById(elementId);
}

function init() {
    byId('generatePrompt').addEventListener('click', onClickGeneratePrompt);
}


function onClickGeneratePrompt() {
    vscode.env.clipboard.writeText("Text 123");
    vscode.postMessage("Copied to Clipboard");
  }