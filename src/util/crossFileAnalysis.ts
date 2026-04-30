'use strict';

import * as vscode from 'vscode';
import { CodeScanExtendedLanguageClient } from '../lsp/client';
import { getReferenceFileUris } from '../util/searchMethodLevelFromSymbol'
import { AnalysisFile, CrossFileAnalysisParams } from '../lsp/protocol';
import { code2ProtocolConverter } from '../util/uri';
import { getCodeScanConfiguration } from '../settings/settings';

const DEBOUNCE_DELAY_MS = 500;
const debounceMap = new Map<string, NodeJS.Timeout>();

async function getReferenceFiles(openedFile: vscode.TextDocument, languageClient: CodeScanExtendedLanguageClient): Promise<AnalysisFile[]> {
  const referenceFileUris = await getReferenceFileUris(openedFile, languageClient);
  return await buildAnalysisFiles(referenceFileUris, vscode.workspace.textDocuments);
}

async function buildAnalysisFiles(
  fileUris: vscode.Uri[],
  openDocuments: readonly vscode.TextDocument[]
): Promise<AnalysisFile[]> {
  const openMap = new Map(openDocuments.map(d => [d.uri.path, d]));

  // parallel reads — open files are free (in memory), closed files read from disk
  return await Promise.all(
    fileUris.map(async uri => {
      const openDoc = openMap.get(uri.path);
      const text = openDoc ? openDoc.getText() : new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));

      return {
        uri: code2ProtocolConverter(uri),
        languageId: '[unknown]',
        version: openDoc?.version ?? 1,
        text
      };
    })
  );
}

async function buildCrossFileAnalysisParams(openedFile: vscode.TextDocument, languageClient:  CodeScanExtendedLanguageClient): Promise<CrossFileAnalysisParams> {
  const [referenceFiles] = await Promise.all([ await getReferenceFiles(openedFile, languageClient)]);
  return {
    fileOpened: {
      uri: openedFile.uri.toString(),
      languageId: openedFile.languageId,
      version: openedFile.version,
      text: openedFile.getText()
    },
    referenceFiles: referenceFiles
  };
}

export async function didOpenWithCrossFileAnalysis(
  openedFile: vscode.TextDocument,
  languageClient: CodeScanExtendedLanguageClient
): Promise<void> {
  const params = await buildCrossFileAnalysisParams(openedFile, languageClient);
  languageClient.notifyDidOpenWithCrossFileAnalysis(params);
}


export async function didChangeWithCrossFileAnalysis(
  openedFile: vscode.TextDocument,
  languageClient: CodeScanExtendedLanguageClient
): Promise<void> {
  const key = openedFile.uri.fsPath;

  if (debounceMap.has(key)) {
    clearTimeout(debounceMap.get(key)!);
  }
  const delay =
   await getCodeScanConfiguration().get<number>('debounce.delay') ?? DEBOUNCE_DELAY_MS;
  debounceMap.set(key, setTimeout(async () => {
    debounceMap.delete(key);
    const params = await buildCrossFileAnalysisParams(openedFile, languageClient);
    languageClient.notifyDidChangeWithCrossFileAnalysis(params);
  },  delay));
}