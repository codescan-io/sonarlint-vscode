/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2022 SonarSource SA
 * sonarlint@sonarsource.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import * as VSCode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { ServerMode } from './java';
import { RulesResponse } from './rules';
import { code2ProtocolConverter } from './uri';

export class CodeScanExtendedLanguageClient extends LanguageClient {
  listAllRules(): Thenable<RulesResponse> {
    return this.sendRequest('codescan/listAllRules');
  }

  didClasspathUpdate(projectRoot: VSCode.Uri): void {
    this.sendNotification('codescan/didClasspathUpdate', code2ProtocolConverter(projectRoot));
  }

  didJavaServerModeChange(serverMode: ServerMode) {
    this.sendNotification('codescan/didJavaServerModeChange', serverMode);
  }

  didLocalBranchNameChange(folderRoot: VSCode.Uri, branchName?: string) {
    const folderUri = code2ProtocolConverter(folderRoot);
    this.sendNotification('codescan/didLocalBranchNameChange', { folderUri, branchName });
  }
}
