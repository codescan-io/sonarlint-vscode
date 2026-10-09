/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as VSCode from 'vscode';
import { isVerboseEnabled } from '../settings/settings';

let codeScanOutput: VSCode.OutputChannel;

const MASK = '******';
// `sonar.login=xxx` as printed by the language server's analysis configuration dump
const SECRET_PROPERTY_PATTERN = /((?:sonar\.login|sonar\.token|sonar\.password)\s*=\s*)([^,}\]\s]+)/gi;
// `"token": "xxx"` / `"sonar.login": "xxx"` as found in LSP traces and JSON payloads
const SECRET_JSON_PATTERN = /("(?:token|password|sonar\.login|sonar\.token|sonar\.password)"\s*:\s*")([^"]*)(")/gi;
// Raw SonarQube/CodeScan tokens (user, project, analysis) wherever they appear
const RAW_TOKEN_PATTERN = /\b(sq[upa]_)[0-9a-f]{20,}\b/gi;
const TOKEN_PREFIX_PATTERN = /^sq[upa]_/i;

// Keeps the token type prefix (e.g. `squ_`) visible so logs still show which kind of token was used
function mask(secret: string): string {
  const prefix = TOKEN_PREFIX_PATTERN.exec(secret);
  return (prefix ? prefix[0] : '') + MASK;
}

export function redactSecrets(message: string): string {
  if (typeof message !== 'string') {
    return message;
  }
  return message
    .replace(SECRET_PROPERTY_PATTERN, (_match, key, secret) => key + mask(secret))
    .replace(SECRET_JSON_PATTERN, (_match, key, secret, quote) => key + mask(secret) + quote)
    .replace(RAW_TOKEN_PATTERN, `$1${MASK}`);
}

/**
 * Wraps an output channel so that everything written to it, including messages and traces forwarded
 * by the language client from the language server, is stripped of credentials.
 */
export function createRedactingOutputChannel(channel: VSCode.OutputChannel): VSCode.OutputChannel {
  return {
    get name() {
      return channel.name;
    },
    append: (value: string) => channel.append(redactSecrets(value)),
    appendLine: (value: string) => channel.appendLine(redactSecrets(value)),
    replace: (value: string) => channel.replace(redactSecrets(value)),
    clear: () => channel.clear(),
    show: (columnOrPreserveFocus?: VSCode.ViewColumn | boolean, preserveFocus?: boolean) =>
      typeof columnOrPreserveFocus === 'boolean'
        ? channel.show(columnOrPreserveFocus)
        : channel.show(columnOrPreserveFocus, preserveFocus),
    hide: () => channel.hide(),
    dispose: () => channel.dispose()
  };
}

export function initLogOutput(context: VSCode.ExtensionContext) {
  const rawOutput = VSCode.window.createOutputChannel('CodeScan');
  context.subscriptions.push(rawOutput);
  codeScanOutput = createRedactingOutputChannel(rawOutput);
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
