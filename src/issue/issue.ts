/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

'use strict';

import { CodeScanExtendedLanguageClient } from '../lsp/client';

export class IssueService {

  private static _instance: IssueService;

  static init(languageClient: CodeScanExtendedLanguageClient): void {
    IssueService._instance = new IssueService(languageClient);
  }

  constructor(private readonly languageClient: CodeScanExtendedLanguageClient) {
  }

  static get instance(): IssueService {
    return IssueService._instance;
  }

  changeIssueStatus(configScopeId: string, issueKey: string,
                    newStatus: string, fileUri: string, isTaintIssue: boolean): Promise<void> {
    return this.languageClient.changeIssueStatus(configScopeId, issueKey, newStatus, fileUri, isTaintIssue);
  }

  addComment(configScopeId: string, issueKey: string, text: string): Promise<void> {
    return this.languageClient.addIssueComment(configScopeId, issueKey, text);
  }
}
