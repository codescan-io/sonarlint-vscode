import * as vscode from 'vscode';

const APEX_EXTENSIONS = ['.cls', '.trigger'];
const DEPENDENCY_FILE_LIMIT = 100;
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

// ---- Symbol Cache ----

class SymbolCache {
  private cache = new Map<string, vscode.DocumentSymbol[]>();

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

  clear() {
    this.cache.clear();
  }
}

// ---- BFS ----

async function bfsTraverseMethodUsages(
  startMethods: QueueItem[],
  maxLevel: number,
  symbolCache: SymbolCache
): Promise<vscode.Uri[]> {
  const queue: QueueItem[] = [...startMethods];
  const visitedMethods = new Set<string>();
  const uniqueFilePaths = new Set<string>();

  while (queue.length > 0) {
    if (uniqueFilePaths.size >= DEPENDENCY_FILE_LIMIT) break;

    const current = queue.shift()!;
    const methodId = `${current.uri.fsPath}::${current.method.name}`;
    if (visitedMethods.has(methodId)) continue;
    visitedMethods.add(methodId);

    const refs = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      current.uri,
      current.method.selectionRange.start
    );
    if (!refs) continue;

    for (const ref of refs) {
      if (uniqueFilePaths.size >= DEPENDENCY_FILE_LIMIT) break;
      uniqueFilePaths.add(ref.uri.fsPath);

      if (current.level >= maxLevel) continue;

      const fileSymbols = await symbolCache.get(ref.uri);
      if (!fileSymbols) continue;

      const callerMethod = findEnclosingMethod(fileSymbols, ref.range.start);
      if (callerMethod) {
        queue.push({ uri: ref.uri, method: callerMethod, level: current.level + 1 });
      }
    }
  }

  return Array.from(uniqueFilePaths).map(p => vscode.Uri.file(p));
}

// ---- Entry Point ----

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
    if (!symbols?.length){
      return [];
    }

    const methods = collectMethods(symbols);
    if (!methods.length){
       return [];
    }

    const initialQueue: QueueItem[] = methods.map(method => ({
      uri: document.uri,
      method,
      level: 1
    }));

    const uris = await bfsTraverseMethodUsages(initialQueue, maxLevel, symbolCache);

    // exclude the opened file itself
    const result = uris.filter(u => u.fsPath !== document.uri.fsPath);
    return result;
  } finally {
    _isFindingReferences = false; // always resets even if error thrown
  }
}
