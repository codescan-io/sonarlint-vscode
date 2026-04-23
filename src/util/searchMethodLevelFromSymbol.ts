import * as vscode from 'vscode';
import { getCodeScanConfiguration } from '../settings/settings';
import { CodeScanExtendedLanguageClient } from '../lsp/client';
const APEX_EXTENSIONS = ['.cls', '.trigger'];
const WARMUP_DELAY_MS = 100;
const DEFAULT_MAX_LEVEL = 2;
const DEFAULT_REFERENCE_FILE_LIMIT = 50;
let _isFindingReferences = false;
let _anyTraversalLimitReached = false;
export const isFindingReferences = () => _isFindingReferences;

interface QueueItem {
  uri: vscode.Uri;
  method: vscode.DocumentSymbol;
}

interface TraversalOptions {
  maxLevel: number;
  referenceFileLimit: number;
}

function collectMethods(symbols: vscode.DocumentSymbol[], out: vscode.DocumentSymbol[] = []): vscode.DocumentSymbol[] {
  for (const symbol of symbols) {
    if (symbol.kind === vscode.SymbolKind.Method) out.push(symbol);
    if (symbol.children?.length) collectMethods(symbol.children, out);
  }
  return out;
}

function findEnclosingMethod(
  symbols: vscode.DocumentSymbol[],
  position: vscode.Position
): vscode.DocumentSymbol | undefined {
  for (const symbol of symbols) {
    if (!symbol.range.contains(position)) continue;
    if (symbol.children?.length) {
      const child = findEnclosingMethod(symbol.children, position);
      if (child) return child;
    }
    if (symbol.kind === vscode.SymbolKind.Method) return symbol;
  }
  return undefined;
}

class SymbolCache {
  private readonly cache = new Map<string, vscode.DocumentSymbol[]>();

  async get(uri: vscode.Uri): Promise<vscode.DocumentSymbol[] | undefined> {
    const key = uri.fsPath;
    if (this.cache.has(key)) return this.cache.get(key);
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      uri
    );
    if (symbols) this.cache.set(key, symbols);
    return symbols;
  }
}

function getMethodId(item: QueueItem): string {
  return `${item.uri.fsPath}::${item.method.name}::${item.method.selectionRange.start.line}:${item.method.selectionRange.start.character}`;
}

function getReferenceId(ref: vscode.Location): string {
  return `${ref.uri.fsPath}::${ref.range.start.line}:${ref.range.start.character}`;
}

function getTraversalOptions(): TraversalOptions {
  const configuration = getCodeScanConfiguration();
  return {
    maxLevel: configuration.get<number>('referenceFiles.depth') ?? DEFAULT_MAX_LEVEL,
    referenceFileLimit: configuration.get<number>('referenceFiles.limit') ?? DEFAULT_REFERENCE_FILE_LIMIT
  };
}

async function bfsTraverseSingleMethodUsages(
  startMethod: QueueItem,
  symbolCache: SymbolCache,
  options: TraversalOptions
): Promise<vscode.Uri[]> {
  const { maxLevel, referenceFileLimit } = options;
  let currentLevel: QueueItem[] = [startMethod];
  const visitedMethods = new Set<string>();
  const uniqueFilePaths = new Set<string>();
  let hasSkippedFilesDueToLimit = false;
  let hasSkippedFilesDueToDepth = false;

  for (let level = 1; level <= maxLevel; level++) {
    if (uniqueFilePaths.size >= referenceFileLimit) {
      break;
    }
    if (currentLevel.length === 0) break;

    // filter already visited before fetching
    const toProcess = currentLevel.filter(item => {
      const methodId = getMethodId(item);
      if (visitedMethods.has(methodId)) return false;
      visitedMethods.add(methodId);
      return true;
    });

    // fetch all refs at this level in parallel
    const levelResults = await Promise.all(
      toProcess.map(async item => {
        const refs = await vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeReferenceProvider',
          item.uri,
          item.method.selectionRange.start
        );
        return refs ?? [];
      })
    );

    // flatten without .flat()
    const allRefs = levelResults.reduce<vscode.Location[]>((acc, refs) => acc.concat(refs), []);
    const seenRefs = new Set<string>();
    const refsWithinLimit: vscode.Location[] = [];

    for (const ref of allRefs) {
      const refId = getReferenceId(ref);
      if (seenRefs.has(refId)) {
        continue;
      }
      seenRefs.add(refId);

      const isKnownFile = uniqueFilePaths.has(ref.uri.fsPath);
      if (isKnownFile || uniqueFilePaths.size < referenceFileLimit) {
        if (!isKnownFile) {
          uniqueFilePaths.add(ref.uri.fsPath);
        }
        refsWithinLimit.push(ref);
        continue;
      }

      hasSkippedFilesDueToLimit = true;
    }

    if (level === maxLevel) {
      const hasNextDepthCandidates = await Promise.all(
        refsWithinLimit.map(async ref => {
          const fileSymbols = await symbolCache.get(ref.uri);
          if (!fileSymbols) return false;

          const callerMethod = findEnclosingMethod(fileSymbols, ref.range.start);
          if (!callerMethod) return false;

          return !visitedMethods.has(
            getMethodId({ uri: ref.uri, method: callerMethod })
          );
        })
      );

      hasSkippedFilesDueToDepth = await hasNextDepthCandidates.some(Boolean);
      break;
    }

    // collect file paths + build next level in parallel
    const nextLevelResults = await Promise.all(
      refsWithinLimit.map(async ref => {
        const fileSymbols = await symbolCache.get(ref.uri);
        if (!fileSymbols) return null;

        const callerMethod = findEnclosingMethod(fileSymbols, ref.range.start);
        return callerMethod ? { uri: ref.uri, method: callerMethod } : null;
      })
    );

    currentLevel = await nextLevelResults.filter((item): item is QueueItem => item !== null);
  }

  if (hasSkippedFilesDueToLimit) {
    _anyTraversalLimitReached = true;
  }

  if (hasSkippedFilesDueToDepth) {
    _anyTraversalLimitReached = true;
  }

  return Array.from(uniqueFilePaths).map(p => vscode.Uri.file(p));
}

async function bfsTraverseMethodUsages(
  startMethods: QueueItem[],
  symbolCache: SymbolCache,
  options: TraversalOptions
): Promise<vscode.Uri[]> {
  const methodResults = await Promise.all(
    startMethods.map(method => bfsTraverseSingleMethodUsages(method, symbolCache, options))
  );
  const uniqueFilePaths = new Set<string>();

  for (const uris of methodResults) {
    for (const uri of uris) {
      uniqueFilePaths.add(uri.fsPath);
    }
  }

  return Array.from(uniqueFilePaths).map(filePath => vscode.Uri.file(filePath));
}

export async function getReferenceFileUris(
  document: vscode.TextDocument | undefined, languageClient: CodeScanExtendedLanguageClient
): Promise<vscode.Uri[]> {
  if (_isFindingReferences) return [];
  if (!document) return [];
  if (!APEX_EXTENSIONS.some(ext => document.fileName.endsWith(ext))) return [];

  const options = getTraversalOptions();

  _isFindingReferences = true;
  _anyTraversalLimitReached = false;
  const symbolCache = new SymbolCache();

  try {
    await new Promise(resolve => setTimeout(resolve, WARMUP_DELAY_MS));

    const symbols = await symbolCache.get(document.uri);
    if (!symbols?.length) return [];

    const methods = collectMethods(symbols);
    if (!methods.length) return [];

    const uris = await bfsTraverseMethodUsages(
      methods.map(method => ({ uri: document.uri, method })),
      symbolCache,
      options
    );
    if (_anyTraversalLimitReached) {
      languageClient.logCrossFileAnalysisLimitExceeded(document.uri.toString());
    }
    
    return uris.filter(u => u.fsPath !== document.uri.fsPath);
  } finally {
    _isFindingReferences = false;
    _anyTraversalLimitReached = false;
  }
}
