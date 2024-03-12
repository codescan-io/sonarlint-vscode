/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

'use strict';

import * as VSCode from 'vscode';
import { ServerType } from '../connected/connections';
import { BindingSuggestion } from '../lsp/protocol';
import { BaseConnection } from '../settings/connectionsettings';
import { removeTrailingSlashes } from '../connected/connectionsetup';

export function serverProjectsToQuickPickItems(serverProjects: BindingSuggestion[], serverType: ServerType) {
  const itemsList: VSCode.QuickPickItem[] = [];
  if (serverProjects) {
    for (const project of serverProjects) {
      itemsList.push({
        label: project.sonarProjectName,
        description: project.sonarProjectKey,
        buttons: [
          {
            iconPath: new VSCode.ThemeIcon('link-external'),
            tooltip: `View in ${serverType}`
          }
        ]
      } as AutoBindProjectQuickPickItem);
    }
  }
  return itemsList;
}

export function buildBaseServerUrl(connection: BaseConnection, serverUrlOrOrganizationKey: string) {
  return connection.isCloudConnection ? removeTrailingSlashes(connection.serverUrl) + '/project/overview' : `${serverUrlOrOrganizationKey}/dashboard`;
}

export interface AutoBindProjectQuickPickItem extends VSCode.QuickPickItem {
  connectionId?: string;
}
