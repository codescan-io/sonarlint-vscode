import * as vscode from 'vscode';
import { getCodeScanConfiguration } from '../settings/settings';
import { CodeScanExtendedLanguageClient } from '../lsp/client';
const APEX_EXTENSIONS = ['.cls', '.trigger'];
const WARMUP_DELAY_MS = 100;
const DEFAULT_MAX_LEVEL = 2;
const DEFAULT_REFERENCE_FILE_LIMIT = 50;
let _isFindingReferences = false;
let hasSkippedFilesDueToLimit = false;
let hasSkippedFilesDueToDepth = false;

export const isFindingReferences = async () => _isFindingReferences;


interface QueueItem {
  uri: vscode.Uri;
  method: vscode.DocumentSymbol;
  parentMethodId: number;
}

interface TraversalOptions {
  maxLevel: number;
  referenceFileLimit: number;
}


function collectFlatMethods(
  symbols: vscode.DocumentSymbol[],
  out: vscode.DocumentSymbol[] = []
): vscode.DocumentSymbol[] {
  for (const symbol of symbols) {
    if (symbol.kind === vscode.SymbolKind.Method) {
      out.push(symbol);
    }

    if (symbol.children?.length) {
      collectFlatMethods(symbol.children, out);
    }
  }
  return out;
}

function comparePosition(a: vscode.Position, b: vscode.Position): number {
  if (a.line !== b.line) {
    return a.line - b.line;
  }

  return a.character - b.character;
}

function sortMethodsByStart(methods: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
  return methods.sort((a, b) => comparePosition(a.range.start, b.range.start));
}

/**
 * Finds the method that contains a given position.
 *
 * Uses binary search on sorted methods to do it quickly.
 * Works because Apex methods are not nested.
 */
function findEnclosingMethod(
  sortedMethods: vscode.DocumentSymbol[],
  position: vscode.Position
): vscode.DocumentSymbol | undefined {
  let lo = 0;
  let hi = sortedMethods.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const start = sortedMethods[mid].range.start;
    if (sortedMethods[mid].range.contains(position)) {
      return sortedMethods[mid];
    }
    if (comparePosition(start, position) <= 0) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return undefined;
}

class SymbolCache {
  private readonly symbolsCache = new Map<string, Promise<vscode.DocumentSymbol[] | undefined>>();

  private readonly flatMethodsCache = new Map<string, Promise<vscode.DocumentSymbol[]>>();

  getSymbols(uri: vscode.Uri): Promise<vscode.DocumentSymbol[] | undefined> {
    const key = uri.fsPath;

    let symbolsPromise = this.symbolsCache.get(key);

    if (!symbolsPromise) {
      symbolsPromise = Promise.resolve(
        vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>('vscode.executeDocumentSymbolProvider', uri)
      );

      this.symbolsCache.set(key, symbolsPromise);
    }

    return symbolsPromise;
  }

  getFlatMethods(uri: vscode.Uri): Promise<vscode.DocumentSymbol[]> {
    const key = uri.fsPath;

    let flatMethodsPromise = this.flatMethodsCache.get(key);

    if (!flatMethodsPromise) {
      flatMethodsPromise = this.getSymbols(uri).then(symbols => {
        if (!symbols?.length) {
          return [];
        }

        return sortMethodsByStart(collectFlatMethods(symbols));
      });

      this.flatMethodsCache.set(key, flatMethodsPromise);
    }

    return flatMethodsPromise;
  }
}

function getMethodId(uri: vscode.Uri, method: vscode.DocumentSymbol): string {
  return `${uri.fsPath}::${method.name}::${method.selectionRange.start.line}`;
}

function getTraversalOptions(): TraversalOptions {
  const configuration = getCodeScanConfiguration();
  return {
    maxLevel: configuration.get<number>('referenceFiles.depth') ?? DEFAULT_MAX_LEVEL,
    referenceFileLimit: configuration.get<number>('referenceFiles.limit') ?? DEFAULT_REFERENCE_FILE_LIMIT
  };
}

async function getMethodReferences(uri: vscode.Uri, method: vscode.DocumentSymbol): Promise<vscode.Location[]> {
  const references = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider',
    uri,
    method.selectionRange.start
  );

  return references ?? [];
}

async function bfsTraverseMethodUsages(
  startMethods: QueueItem[],
  options: TraversalOptions,
  symbolCache: SymbolCache
): Promise<vscode.Uri[]> {
  let currentLevelMethodDeclarations: QueueItem[] = [...startMethods];

  const visitedMethods = new Set<string>();
  const uniqueFileUris = new Map<string, vscode.Uri>();

  const remainingMethodReferences = new Array(startMethods.length).fill(options.referenceFileLimit);

  for (const item of startMethods) {
    visitedMethods.add(getMethodId(item.uri, item.method));
  }

  /**
   * Example:
   * options.maxLevel = 1
   *
   * level 1 = direct references, collect + enqueue
   * level 2 = look-ahead only, flag depth skip if new unvisited method exists
   */
  const maxTraversalLevel = options.maxLevel;
  const depthCheckLevel = options.maxLevel + 1;

  for (let level = 1; level <= depthCheckLevel; level++) {
    if (!currentLevelMethodDeclarations.length) {
      break;
    }

    const nextLevelMethodDeclarations: QueueItem[] = [];

    for (const methodDeclaration of currentLevelMethodDeclarations) {
      const currentParentMethodId = methodDeclaration.parentMethodId;

      if (remainingMethodReferences[currentParentMethodId] <= 0) {
        hasSkippedFilesDueToLimit = true;
        continue;
      }

      const methodReferences = await getMethodReferences(methodDeclaration.uri, methodDeclaration.method);

      for (const methodReference of methodReferences) {
        const flatMethods = await symbolCache.getFlatMethods(methodReference.uri);

        if (!flatMethods.length) {
          continue;
        }

        const callerMethodDeclaration = findEnclosingMethod(flatMethods, methodReference.range.start);

        if (!callerMethodDeclaration) {
          continue;
        }

        const callerMethodDeclarationId = getMethodId(methodReference.uri, callerMethodDeclaration);

        if (visitedMethods.has(callerMethodDeclarationId)) {
          continue;
        }

        /**
         * Look-ahead depth:
         *
         * We found a new unvisited method beyond configured depth.
         * Set flag and stop scanning this reference list.
         *
         * Do not add file.
         * Do not mark visited.
         * Do not enqueue.
         */
        if (level > maxTraversalLevel) {
          hasSkippedFilesDueToDepth = true;
          break;
        }

        if (remainingMethodReferences[currentParentMethodId] <= 0) {
          hasSkippedFilesDueToLimit = true;
          break;
        }

        visitedMethods.add(callerMethodDeclarationId);

        if (!uniqueFileUris.has(methodReference.uri.fsPath)) {
          uniqueFileUris.set(methodReference.uri.fsPath, methodReference.uri);
        }

        remainingMethodReferences[currentParentMethodId]--;

        nextLevelMethodDeclarations.push({
          uri: methodReference.uri,
          method: callerMethodDeclaration,
          parentMethodId: currentParentMethodId
        });
      }
    }

    currentLevelMethodDeclarations = nextLevelMethodDeclarations;
  }

  return [...uniqueFileUris.values()];
}

export async function getReferenceFileUris(
  document: vscode.TextDocument | undefined,
  languageClient: CodeScanExtendedLanguageClient
): Promise<vscode.Uri[]> {
  if (_isFindingReferences || !document) {
    return [];
  }

  if (!APEX_EXTENSIONS.some(ext => document.fileName.endsWith(ext))) {
    return [];
  }

  const options = getTraversalOptions();
  const symbolCache = new SymbolCache();

  _isFindingReferences = true;
  hasSkippedFilesDueToDepth = false;
  hasSkippedFilesDueToLimit = false;

  try {
    await new Promise(resolve => setTimeout(resolve, WARMUP_DELAY_MS));

    const currentFileMethods = await symbolCache.getFlatMethods(document.uri);

    if (!currentFileMethods.length) {
      return [];
    }

    const currentMethodDeclarationQueue: QueueItem[] = currentFileMethods.map((method, id) => ({
      uri: document.uri,
      method,
      parentMethodId: id
    }));

    const uris = await bfsTraverseMethodUsages(currentMethodDeclarationQueue, options, symbolCache);

    if (hasSkippedFilesDueToDepth || hasSkippedFilesDueToLimit) {
      languageClient.logCrossFileAnalysisLimitExceeded(document.uri.toString());
    }

    return uris.filter(uri => uri.fsPath !== document.uri.fsPath);
  } finally {
    _isFindingReferences = false;
    hasSkippedFilesDueToDepth = false;
    hasSkippedFilesDueToLimit = false;
  }
}
