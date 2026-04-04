import * as vscode from 'vscode';

const DEPENDENCY_FILE_LIMIT = 500;
const APEX_EXTENSIONS = ['.cls', '.trigger'];

function collectMethods(symbols: vscode.DocumentSymbol[], out: vscode.DocumentSymbol[] = []): vscode.DocumentSymbol[] {
  for (const symbol of symbols) {
    if (symbol.kind === vscode.SymbolKind.Method) out.push(symbol);
    if (symbol.children?.length) collectMethods(symbol.children, out);
  }
  return out;
}

export async function getDependencyFileUris(document: vscode.TextDocument | undefined): Promise<vscode.Uri[]> {
  if (!document) return [];
  if (!APEX_EXTENSIONS.some(ext => document.fileName.endsWith(ext))) return [];

  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    document.uri
  );
  if (!symbols?.length) return [];

  const methods = collectMethods(symbols);
  if (!methods.length) return [];

  const uniquePaths = new Set<string>();
  const currentFilePath = document.uri.fsPath;

  for (const method of methods) {
    if (uniquePaths.size >= DEPENDENCY_FILE_LIMIT) break; // pool exhausted
    const refs = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      document.uri,
      method.selectionRange.start
    );
    refs?.forEach(ref => {
      if (uniquePaths.size < DEPENDENCY_FILE_LIMIT && ref.uri.fsPath !== currentFilePath) {
        uniquePaths.add(ref.uri.fsPath);
      }
    });
  }

  return Array.from(uniquePaths).map(p => vscode.Uri.file(p));
}
