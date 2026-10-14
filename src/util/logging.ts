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
// `sonar.login=xxx` as printed by the language server's analysis configuration dump
const SECRET_PROPERTY_REGEX = /((?:sonar\.login|sonar\.token|sonar\.password)\s*=\s*)([^,}\]\s]+)/gi;
// `"token": "xxx"` / `"sonar.login": "xxx"` as found in message traces and JSON payloads
const SECRET_JSON_REGEX = /("(?:token|password|sonar\.login|sonar\.token|sonar\.password)"\s*:\s*")([^"]*)(")/gi;
// Raw SonarQube/CodeScan tokens (user, project, analysis) wherever they appear
const RAW_TOKEN_REGEX = /\bsq[upa]_[0-9a-f]{20,}\b/gi;

export function initLogOutput(context: VSCode.ExtensionContext) {
  const rawOutput = VSCode.window.createOutputChannel('CodeScan');
  context.subscriptions.push(rawOutput);
  // Everything written to the CodeScan output, including server logs and message traces, gets tokens masked
  codeScanOutput = createTokenMaskingOutputChannel(rawOutput);
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

// Passwords are masked entirely, tokens keep their first characters
function maskSecret(key: string, secret: string): string {
  return /password/i.test(key) ? '*'.repeat(secret.length) : maskToken(secret);
}

/**
 * Masks registered tokens wherever they appear, plus anything that looks like a credential,
 * as a fallback for tokens that were never registered.
 */
export function maskTokens(text: string): string {
  if (typeof text !== 'string') {
    return text;
  }
  let masked = text;
  knownTokens.forEach(token => {
    masked = masked.split(token).join(maskToken(token));
  });
  return masked
    .replace(SECRET_PROPERTY_REGEX, (_match, key, secret) => key + maskSecret(key, secret))
    .replace(SECRET_JSON_REGEX, (_match, key, secret, quote) => key + maskSecret(key, secret) + quote)
    .replace(RAW_TOKEN_REGEX, token => maskToken(token));
}

/**
 * Wraps an output channel so that tokens are masked before anything is written to it.
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
