/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2023 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as VSCode from 'vscode';
import { isVerboseEnabled } from '../settings/settings';

let codeScanOutput: VSCode.OutputChannel;

export function initLogOutput(context: VSCode.ExtensionContext) {
  codeScanOutput = VSCode.window.createOutputChannel('CodeScan');
  context.subscriptions.push(codeScanOutput);
}

export function getLogOutput() {
  return codeScanOutput;
}

export function logToCodeScanOutput(message) {
  if (codeScanOutput) {
    codeScanOutput.appendLine(message);
  }
}

export function showLogOutput() {
  getLogOutput()?.show();
}

export function verboseLogToCodeScanOutput(message: string) {
  if (isVerboseEnabled()) {
    logToCodeScanOutput(message);
  }
}

export function logNoSubmodulesFound(repo: string, error: string) {
  verboseLogToCodeScanOutput(`No submodules found in '${repo}' repository. Error: ${error}`);
}

export function logGitCheckIgnoredError(error: string) {
  verboseLogToCodeScanOutput(`Error when detecting ignored files: ${error}`);
}
