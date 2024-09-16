/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

const VSCode = acquireVsCodeApi();

window.addEventListener('load', init);

function byId(elementId) {
  return document.getElementById(elementId);
}

function init() {
    byId('generatePrompt').addEventListener('click', onClickGeneratePrompt);
}


function onClickGeneratePrompt() {
  console.log("DF DEMO :::");
  VSCode.postMessage({
    command: 'generatePrompt'});
  }