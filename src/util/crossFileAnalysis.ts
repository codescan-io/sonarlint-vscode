'use strict';

import * as vscode from 'vscode';
import { CodeScanExtendedLanguageClient } from '../lsp/client';
import { getDependencyFileUris } from '../util/searchMethodFromSymbol';
import { AnalysisFile, CrossFileAnalysisParams } from '../lsp/protocol';
import { tooManyFilesConfirmation } from '../util/showMessage';
import { code2ProtocolConverter } from '../util/uri';
import { filesCountCheck } from '../hotspot/hotspots';

const DEBOUNCE_DELAY_MS = 500;
const debounceMap = new Map<string, NodeJS.Timeout>();

async function getDependencyFiles(openedFile: vscode.TextDocument): Promise<AnalysisFile[]> {
  const dependencyFileUris = await getDependencyFileUris(openedFile);
  const shouldAnalyze = await filesCountCheck(dependencyFileUris.length, tooManyFilesConfirmation);
  if (!shouldAnalyze) return [];
  return buildAnalysisFiles(dependencyFileUris, vscode.workspace.textDocuments);
}

async function buildAnalysisFiles(
  fileUris: vscode.Uri[],
  openDocuments: readonly vscode.TextDocument[]
): Promise<AnalysisFile[]> {
  const openMap = new Map(openDocuments.map(d => [d.uri.path, d]));

  // parallel reads — open files are free (in memory), closed files read from disk
  return Promise.all(
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

async function buildCrossFileAnalysisParams(openedFile: vscode.TextDocument): Promise<CrossFileAnalysisParams> {
  const [dependencyFiles] = await Promise.all([getDependencyFiles(openedFile)]);
  return {
    fileOpened: {
      uri: openedFile.uri.toString(),
      languageId: openedFile.languageId,
      version: openedFile.version,
      text: openedFile.getText()
    },
    dependencyFiles: dependencyFiles
  };
}

export async function didOpenWithCrossFileAnalysis(
  openedFile: vscode.TextDocument,
  languageClient: CodeScanExtendedLanguageClient
): Promise<void> {
  const params = await buildCrossFileAnalysisParams(openedFile);
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

  debounceMap.set(key, setTimeout(async () => {
    debounceMap.delete(key);
    const params = await buildCrossFileAnalysisParams(openedFile);
    languageClient.notifyDidChangeWithCrossFileAnalysis(params);
  }, DEBOUNCE_DELAY_MS));
}