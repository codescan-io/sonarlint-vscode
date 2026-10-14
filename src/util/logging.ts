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
const knownTokens = new Set<string>();
const VISIBLE_TOKEN_CHARS = 6;
const TOKEN_FIELD_REGEX = /("token"\s*:\s*")([^"]*)(")/g;

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

/**
 * Keeps the first 6 characters of the token and replaces the rest with '*', so logs never contain the full secret.
 * Tokens of 6 characters or fewer are masked entirely.
 */
export function maskToken(token: string): string {
  const visible = token.length > VISIBLE_TOKEN_CHARS ? VISIBLE_TOKEN_CHARS : 0;
  return token.substring(0, visible) + '*'.repeat(token.length - visible);
}

/**
 * Remembers a token so that any later log line containing it gets it masked.
 */
export function registerTokenForMasking(token: string | undefined) {
  if (token) {
    knownTokens.add(token);
  }
}

export function maskTokens(text: string): string {
  let masked = text.replace(TOKEN_FIELD_REGEX, (_match, before, token, after) => before + maskToken(token) + after);
  knownTokens.forEach(token => {
    masked = masked.split(token).join(maskToken(token));
  });
  return masked;
}

/**
 * Wraps an output channel so that tokens are masked before anything is written to it.
 * Used for the language client's log and message trace output.
 */
export function createTokenMaskingOutputChannel(channel: VSCode.OutputChannel): VSCode.OutputChannel {
  return {
    get name() {
      return channel.name;
    },
    append: value => channel.append(maskTokens(value)),
    appendLine: value => channel.appendLine(maskTokens(value)),
    replace: value => channel.replace(maskTokens(value)),
    clear: () => channel.clear(),
    show: (columnOrPreserveFocus?: VSCode.ViewColumn | boolean, preserveFocus?: boolean) =>
      typeof columnOrPreserveFocus === 'boolean'
        ? channel.show(columnOrPreserveFocus)
        : channel.show(columnOrPreserveFocus, preserveFocus),
    hide: () => channel.hide(),
    dispose: () => channel.dispose()
  };
}
