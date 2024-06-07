import * as VSCode from 'vscode';
import * as path from 'path';
import { Diagnostic, PublishDiagnosticsParams } from 'vscode-languageclient';
import { IssueSeverity, RuleType } from '../lsp/protocol';

export class CodeScanIssueFilterViewProvider implements VSCode.WebviewViewProvider {
    public static readonly viewType = 'CodeScanIssueFilter';

    // URIs
    private scriptUri: VSCode.Uri;
    private stylesUri: VSCode.Uri;
    private fontAwesomeUri: VSCode.Uri;

    private readonly extensionUri: VSCode.Uri;
    
    private filterSeverityValue: string;
    private filterTypeValue: string;

    private webview: VSCode.WebviewView;
    private context: VSCode.ExtensionContext;
    private publishedIssues = {};
    private categoryIssueCounts = {};

    constructor(context: VSCode.ExtensionContext) {
        this.context = context;
        this.extensionUri = VSCode.Uri.file(context.extensionPath);
        this.filterSeverityValue = 'ALL';
        this.filterTypeValue = 'ALL';
        this.resetIssueCounts();
    }

    public resolveWebviewView(webview: VSCode.WebviewView, webviewContext: VSCode.WebviewViewResolveContext<unknown>, token: VSCode.CancellationToken): void | Thenable<void> {
        this.webview = webview;
        this.webview.webview.options = {
            enableScripts: true,

            localResourceRoots: [
                this.extensionUri
            ]
        };

        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        this.scriptUri = webview.webview.asWebviewUri(VSCode.Uri.joinPath(this.extensionUri, 'media', 'codescan-issue-filter', 'js', 'script.js'));

        // Do the same for the stylesheet.
        this.stylesUri = webview.webview.asWebviewUri(VSCode.Uri.joinPath(this.extensionUri, 'media', 'codescan-issue-filter', 'css', 'styles.css'));
		this.fontAwesomeUri = webview.webview.asWebviewUri(VSCode.Uri.joinPath(this.extensionUri, 'icons', 'font-awesome-4.7.0', 'css', 'font-awesome.min.css'));

        this.webview.webview.html = this.getWebviewContent();

        this.webview.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'getIssues':
                        let filterKey = message.filterKey;
                        if (filterKey === 'filterSeverity') {
                            this.filterSeverityValue = message.filterValue;
                        } else if (filterKey === 'filterType') {
                            this.filterTypeValue = message.filterValue;
                        }
                        this.updateIssuesInUI();
                        return;
                    case 'openFileAtLocation':
                        this.openFileAtLocation(message.filePath, message.lineNumber);
                        return;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    public getWebviewContent() {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${this.stylesUri}" rel="stylesheet">
                <link href="${this.fontAwesomeUri}" rel="stylesheet" />
                <title>CodeScan Issue Filter</title>
            </head>
            <body>
                <div id="filter-container" class="filter-container"></div>
                <div id="issues"></div>
                <script type="module" src="${this.scriptUri}"></script>           
            </body>
            </html>`;
    }

    private setFilterCategoriesIssueCount() {
        if (!this.publishedIssues) return null;

        this.resetIssueCounts();
        this.setIssuesCategoryCountForSeverityFilter();
        this.setIssuesCategoryCountForRuleTypeFilter();
    }

    private getIssues() {
        if (Object.keys(this.publishedIssues).length === 0) return undefined;
        
        const fileIssuesMap = {};

        for (const fileUri of Object.keys(this.publishedIssues)) {
            const fileIssues = this.publishedIssues[fileUri];
            const filteredIssues: CodeScanDiagnostic[] = [];
            
            // Remove "file://"" at the start to get relative path
            var fileRelativePath = decodeURI(VSCode.workspace.asRelativePath(fileIssues.uri).substring(7));
            var fileName = path.parse(fileIssues.uri).base;
      
            for (const issue of fileIssues.diagnostics) {
                if (this.checkIssueFilterCondition(issue)) {
                    filteredIssues.push(issue);
                }
            }

            fileIssuesMap[fileUri] = {
                issues: filteredIssues, 
                fileName: fileName,
                fileRelativePath: fileRelativePath
            };
        }
       
        return fileIssuesMap;
    }

    private checkIssueFilterCondition(issue) {
        return (
            (!this.filterSeverityValue || this.filterSeverityValue === 'ALL' || this.filterSeverityValue === issue.issueSeverity) &&
            (!this.filterTypeValue || this.filterTypeValue === 'ALL' || this.filterTypeValue === issue.ruleType)
        );
    }

    private setIssuesCategoryCountForSeverityFilter() {
        for (const fileUri of Object.keys(this.publishedIssues)) {
            const fileIssues = this.publishedIssues[fileUri];

            for (const issue of fileIssues.diagnostics) {
                if (!this.filterSeverityValue || this.filterSeverityValue === 'ALL' || this.filterSeverityValue === issue.issueSeverity) {
                    this.categoryIssueCounts[issue.ruleType] += 1;
                    this.categoryIssueCounts['RULETYPE-ALL'] += 1;
                }
            }
        }
    }

    private setIssuesCategoryCountForRuleTypeFilter() {
        for (const fileUri of Object.keys(this.publishedIssues)) {
            const fileIssues = this.publishedIssues[fileUri];
                              
            for (const issue of fileIssues.diagnostics) {
                if (!this.filterTypeValue || this.filterTypeValue === 'ALL' || this.filterTypeValue === issue.ruleType) {
                    this.categoryIssueCounts[issue.issueSeverity] += 1;
                    this.categoryIssueCounts['SEVERITY-ALL'] += 1;
                }
            }
        }
    }

    private resetIssueCounts() {
        this.categoryIssueCounts = {
            'SEVERITY-ALL': 0,
            'RULETYPE-ALL': 0,
            [RuleType.BUG.toString()]: 0,
            [RuleType.VULNERABILITY.toString()]: 0,
            [RuleType.CODE_SMELL.toString()]: 0,
            [IssueSeverity.BLOCKER.toString()]: 0,
            [IssueSeverity.CRITICAL.toString()]: 0,
            [IssueSeverity.MAJOR.toString()]: 0,
            [IssueSeverity.MINOR.toString()]: 0,
            [IssueSeverity.INFO.toString()]: 0
        };
    }


    async openFileAtLocation(filePath: string, lineNumber: number) {
        const uri = VSCode.Uri.parse(filePath);
        const doc = await VSCode.workspace.openTextDocument(uri);
        const editor = await VSCode.window.showTextDocument(doc);
        const range = new VSCode.Range(lineNumber, 0, lineNumber, 0);
        editor.revealRange(range, VSCode.TextEditorRevealType.AtTop);
        editor.selection = new VSCode.Selection(range.start, range.end);
    }

    public setPublishedIssues(fileIssues: CodeScanPublishDiagnosticsParams) {
        if (!fileIssues) return;
        if (!fileIssues.uri) return;

        if (!fileIssues.diagnostics || fileIssues.diagnostics.length == 0) {
            delete this.publishedIssues[fileIssues.uri];
        } else {
            this.publishedIssues[fileIssues.uri] = fileIssues;
        }

        if (this.webview) {
            this.updateIssuesInUI();
        }
    }

    private updateIssuesInUI() {
        const issues = this.getIssues();
        this.setFilterCategoriesIssueCount();
        if (issues) {
            this.webview.webview.postMessage({ command: 'updateIssues', issues: issues,  categoryCounts: this.categoryIssueCounts});
        }
    }
}

export interface CodeScanPublishDiagnosticsParams extends PublishDiagnosticsParams {
    diagnostics: CodeScanDiagnostic[];
}

interface CodeScanDiagnostic extends Diagnostic {
    issueSeverity?: string;

    vulnerabilityProbability?: string;

    uri?: string;
}