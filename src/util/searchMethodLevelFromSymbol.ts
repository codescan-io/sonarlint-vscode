import * as vscode from 'vscode';

const APEX_EXTENSIONS = ['.cls', '.trigger'];
const DEPENDENCY_FILE_LIMIT = 500;
const WARMUP_DELAY_MS = 1000;
const DEFAULT_MAX_LEVEL = 4;

let _isFindingReferences = false;
export const isFindingReferences = () => _isFindingReferences;

interface QueueItem {
  uri: vscode.Uri;
  method: vscode.DocumentSymbol;
  level: number;
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

async function bfsTraverseMethodUsages(
  startMethods: QueueItem[],
  maxLevel: number,
  symbolCache: SymbolCache
): Promise<vscode.Uri[]> {
  let currentLevel: QueueItem[] = [...startMethods];
  const visitedMethods = new Set<string>();
  const uniqueFilePaths = new Set<string>();

  for (let level = 1; level <= maxLevel; level++) {
    if (uniqueFilePaths.size >= DEPENDENCY_FILE_LIMIT) break;
    if (currentLevel.length === 0) break;

    // filter already visited before fetching
    const toProcess = currentLevel.filter(item => {
      const methodId = `${item.uri.fsPath}::${item.method.name}`;
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

    // collect file paths + build next level in parallel
    const nextLevelResults = await Promise.all(
      allRefs.map(async ref => {
        if (uniqueFilePaths.size < DEPENDENCY_FILE_LIMIT) {
          uniqueFilePaths.add(ref.uri.fsPath);
        }
        if (level >= maxLevel) return null;

        const fileSymbols = await symbolCache.get(ref.uri);
        if (!fileSymbols) return null;

        const callerMethod = findEnclosingMethod(fileSymbols, ref.range.start);
        return callerMethod ? { uri: ref.uri, method: callerMethod, level: level + 1 } : null;
      })
    );

    currentLevel = nextLevelResults.filter((item): item is QueueItem => item !== null);
  }

  return Array.from(uniqueFilePaths).map(p => vscode.Uri.file(p));
}

export async function getDependencyFileUris(
  document: vscode.TextDocument | undefined,
  maxLevel: number = DEFAULT_MAX_LEVEL
): Promise<vscode.Uri[]> {
  if (!document) return [];
  if (!APEX_EXTENSIONS.some(ext => document.fileName.endsWith(ext))) return [];

  _isFindingReferences = true;
  const symbolCache = new SymbolCache();

  try {
    await new Promise(resolve => setTimeout(resolve, WARMUP_DELAY_MS));

    const symbols = await symbolCache.get(document.uri);
    if (!symbols?.length) return [];

    const methods = collectMethods(symbols);
    if (!methods.length) return [];

    const uris = await bfsTraverseMethodUsages(
      methods.map(method => ({ uri: document.uri, method, level: 1 })),
      maxLevel,
      symbolCache
    );

    return uris.filter(u => u.fsPath !== document.uri.fsPath);
  } finally {
    _isFindingReferences = false;
  }
}
