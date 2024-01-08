/* --------------------------------------------------------------------------------------------
 * SonarLint for VisualStudio Code
 * Copyright (C) 2017-2023 SonarSource SA
 * sonarlint@sonarsource.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as vscode from 'vscode';

import { Commands } from '../util/commands';
import { Connection } from './connections';
import { ConnectionCheckResult } from '../lsp/protocol';
import {
  BaseConnection,
  ConnectionSettingsService,
  isCodeScanCloudConnection
} from '../settings/connectionsettings';
import * as util from '../util/util';
import { escapeHtml, ResourceResolver } from '../util/webview';
import { DEFAULT_CONNECTION_ID } from '../commons';

let connectionSetupPanel: vscode.WebviewPanel;

const sonarQubeNotificationsDocUrl = 'https://docs.sonarqube.org/latest/user-guide/connected-mode/';
const sonarCloudNotificationsDocUrl = 'https://docs.sonarcloud.io/advanced-setup/sonarlint-smart-notifications/';
const TOKEN_RECEIVED_COMMAND = 'tokenReceived';
const OPEN_TOKEN_GENERATION_PAGE_COMMAND = 'openTokenGenerationPage';
const SAVE_CONNECTION_COMMAND = 'saveConnection';
const CHECK_CLOUD_COMMAND = 'checkIfCodeScanCloudUrl';

export function assistCreatingConnection(context: vscode.ExtensionContext) {
  return assistCreatingConnectionParams => {
    assistCreatingConnectionParams.isSonarCloud
      ? connectToCodeScanCloud(context)
      : connectToCodeScanSelfHosted(context)(assistCreatingConnectionParams.serverUrl);
  };
}

export function connectToCodeScanSelfHosted(context: vscode.ExtensionContext) {
  return serverUrl => {
    const initialState = {
      serverUrl: serverUrl && typeof serverUrl === 'string' ? serverUrl : '',
      token: '',
      connectionId: ''
    };
    const serverProductName = 'SonarQube';
    lazyCreateConnectionSetupPanel(context, serverProductName);
    connectionSetupPanel.webview.html = renderConnectionSetupPanel(context, connectionSetupPanel.webview, {
      mode: 'create',
      initialState
    });
    finishSetupAndRevealPanel(serverProductName);
  };
}

export function connectToCodeScanCloud(context: vscode.ExtensionContext) {
  return () => {
    const initialState = {
      organizationKey: '',
      token: '',
      connectionId: '',
      serverUrl: 'https://app.codescan.io'
    };
    const serverProductName = 'CodeScan';
    lazyCreateConnectionSetupPanel(context, serverProductName);
    connectionSetupPanel.webview.html = renderConnectionSetupPanel(context, connectionSetupPanel.webview, {
      mode: 'create',
      initialState
    });
    finishSetupAndRevealPanel(serverProductName);
  };
}

export function editSonarQubeConnection(context: vscode.ExtensionContext) {
  return async (connection: string | Promise<Connection>) => {
    const connectionId = typeof connection === 'string' ? connection : (await connection).id;
    const initialState = await ConnectionSettingsService.instance.loadSonarQubeConnection(connectionId);
    const serverProductName = 'CodeScan Self-hosted';
    lazyCreateConnectionSetupPanel(context, serverProductName);
    connectionSetupPanel.webview.html = renderConnectionSetupPanel(context, connectionSetupPanel.webview, {
      mode: 'update',
      initialState
    });
    finishSetupAndRevealPanel(serverProductName);
  };
}

export function editSonarCloudConnection(context: vscode.ExtensionContext) {
  return async (connection: string | Promise<Connection>) => {
    const connectionId = typeof connection === 'string' ? connection : (await connection).id;
    const initialState = await ConnectionSettingsService.instance.loadSonarCloudConnection(connectionId);
    const serverProductName = 'CodeScan';
    lazyCreateConnectionSetupPanel(context, serverProductName);
    connectionSetupPanel.webview.html = renderConnectionSetupPanel(context, connectionSetupPanel.webview, {
      mode: 'update',
      initialState
    });
    finishSetupAndRevealPanel(serverProductName);
  };
}

function finishSetupAndRevealPanel(serverProductName: string) {
  connectionSetupPanel.webview.onDidReceiveMessage(handleMessage);
  connectionSetupPanel.iconPath = util.resolveExtensionFile('images', `${serverProductName.toLowerCase()}.svg`);
  connectionSetupPanel.reveal();
}

export async function reportConnectionCheckResult(result: ConnectionCheckResult) {
  if (connectionSetupPanel) {
    const command = result.success ? 'connectionCheckSuccess' : 'connectionCheckFailure';
    connectionSetupPanel.webview.postMessage({ command, ...result });
  } else {
    // If connection UI is not shown, fallback to notifications
    if (result.success) {
      vscode.window.showInformationMessage(`Connection with '${result.connectionId}' was successful!`);
    } else {
      const editConnectionAction = 'Edit Connection';
      const reply = await vscode.window.showErrorMessage(
        `Connection with '${result.connectionId}' failed. Please check your settings.`,
        editConnectionAction
      );
      if (reply === editConnectionAction) {
        vscode.commands.executeCommand(Commands.EDIT_SONARQUBE_CONNECTION, result.connectionId);
      }
    }
  }
}

function lazyCreateConnectionSetupPanel(context: vscode.ExtensionContext, serverProductName) {
  if (!connectionSetupPanel) {
    connectionSetupPanel = vscode.window.createWebviewPanel(
      'sonarlint.ConnectionSetup',
      `${serverProductName} Connection`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true
      }
    );
    connectionSetupPanel.onDidDispose(
      () => {
        connectionSetupPanel = undefined;
      },
      null,
      context.subscriptions
    );
  }
}

interface RenderOptions {
  mode: 'create' | 'update';
  initialState: BaseConnection;
}

function renderConnectionSetupPanel(context: vscode.ExtensionContext, webview: vscode.Webview, options: RenderOptions) {
  const resolver = new ResourceResolver(context, webview);
  const styleSrc = resolver.resolve('styles', 'connectionsetup.css');
  const toolkitUri = resolver.resolve('node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.min.js');
  const webviewMainUri = resolver.resolve('webview-ui', 'connectionsetup.js');

  const { mode, initialState } = options;
  // const isCodeScanSelfHosted = !isCodeScanCloudConnection(initialState);
  const isCodeScanSelfHosted = false;

  const serverProductName = isCodeScanSelfHosted ? 'CodeScan Self-hosted' : 'CodeScan';
  const serverDocUrl = isCodeScanSelfHosted ? sonarQubeNotificationsDocUrl : sonarCloudNotificationsDocUrl;

  const initialConnectionId = escapeHtml(initialState.connectionId) || '';
  const initialToken = escapeHtml(initialState.token);

  return `<!doctype html><html lang="en">
    <head>
      <title>${serverProductName} Connection</title>
      <meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
      <meta http-equiv="Encoding" content="utf-8" />
      <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource}; script-src ${webview.cspSource}"/>
      <link rel="stylesheet" type="text/css" href="${styleSrc}" />
      <script type="module" src="${toolkitUri}"></script>
      <script type="module" src="${webviewMainUri}"></script>
    </head>
    <body>
      <h1>${mode === 'create' ? 'New' : 'Edit'} ${serverProductName} Connection</h1>
      <form id="connectionForm">
        ${renderServerUrlField(initialState)}

        ${renderGenerateTokenButton(initialState, serverProductName)}
        <div class="formRowWithStatus">
          <vscode-text-field id="token" type="password" placeholder="········" required size="40"
            title="A user token generated for your account on ${serverProductName}" value="${initialToken}">
            User Token
          </vscode-text-field>
          <span id="tokenStatus" class="hidden">Token received!</span>
          <input type="hidden" id="token-initial" value="${initialToken}" />
        </div>
        ${renderOrganizationKeyField(initialState)}
        <vscode-text-field id="connectionId" type="text" placeholder="My ${serverProductName} Connection" size="40"
          title="Optionally, please give this connection a memorable name. If no name is provided, Sonar will generate one." 
          value="${initialConnectionId}"
          ${options.mode === 'update' ? 'readonly' : ''}>
          Connection Name
        </vscode-text-field>
        <input type="hidden" id="connectionId-initial" value="${initialConnectionId}" />
        <input type="hidden" id="shouldGenerateConnectionId" value="${mode === 'create'}"/>
        <vscode-checkbox id="enableNotifications" ${!initialState.disableNotifications ? 'checked' : ''}>
          Receive notifications from ${serverProductName}
        </vscode-checkbox>
        <input type="hidden" id="enableNotifications-initial" value="${!initialState.disableNotifications}" />
        <p>
          You will receive
          <vscode-link target="_blank" href="${serverDocUrl}">notifications</vscode-link>
          from ${serverProductName} in situations like:
        </p>
        <ul>
          <li>the Quality Gate status of a bound project changes</li>
          <li>the latest analysis of a bound project on ${serverProductName} raises new issues assigned to you</li>
        </ul>
        <div id="connectionCheck" class="formRowWithStatus">
          <vscode-button id="saveConnection" disabled>Save Connection</vscode-button>
          <span id="connectionProgress" class="hidden">
            <vscode-progress-ring/>
          </span>
          <span id="connectionStatus"></span>
        </div>
      </form>
    </body>
  </html>`;
}

function renderServerUrlField(connection) {
  const serverUrl = escapeHtml(connection.serverUrl);
  return `<vscode-text-field id="serverUrl" type="url" placeholder="https://app.codescan.io/" required size="40"
  title="The base URL for your CodeScan server" autofocus value="${serverUrl}">
    Server URL
  </vscode-text-field>
  <input type="hidden" id="serverUrl-initial" value="${serverUrl}" />`;
  return '';
}

function renderGenerateTokenButton(connection, serverProductName) {
  const buttonDisabled = connection.serverUrl === '' ? 'disabled' : '';
  return `<div id="tokenGeneration" class="formRowWithStatus">
      <vscode-button id="generateToken" ${buttonDisabled}>
        Generate Token
      </vscode-button>
      <span id="tokenGenerationProgress" class="hidden">
        <vscode-progress-ring/>
      </span>
      <span id="tokenGenerationResult"></span>
    </div>
    <p>
      You can use the button above to generate a user token in your ${serverProductName} settings,
      copy it and paste it in the field below.
    </p>`;
}

function renderOrganizationKeyField(connection) {
  const organizationKey = escapeHtml(connection.organizationKey);
  return `<vscode-text-field id="organizationKey" type="text" placeholder="your-organization" required size="40"
    title="The key of your organization on CodeScan" autofocus value="${organizationKey}" >
      Organization Key
    </vscode-text-field>
    <input type="hidden" id="organizationKey-initial" value="${organizationKey}" />`;
}

/*
 * Exported for unit tests
 */
export async function handleMessage(message) {
  switch (message.command) {
    case OPEN_TOKEN_GENERATION_PAGE_COMMAND:
      await openTokenGenerationPage(message);
      break;
    case SAVE_CONNECTION_COMMAND:
      delete message.command;
      if (!message.disableNotifications) {
        delete message.disableNotifications;
      }
      if (!message.connectionId) {
        message.connectionId = getDefaultConnectionId(message);
      }
      if (message.serverUrl) {
        message.serverUrl = cleanServerUrl(message.serverUrl);
      }
      await saveConnection(message);
      break;
    case CHECK_CLOUD_COMMAND:
      await isCodeScanCloudServer(message);
      break;
  }
}

export function getDefaultConnectionId(message): string {
  let defaultConnectionId = DEFAULT_CONNECTION_ID;
  if (message.serverUrl) {
    defaultConnectionId = cleanServerUrl(message.serverUrl);
  }
  if(message.organizationKey) {
    defaultConnectionId =  message.organizationKey;
  }
  return defaultConnectionId;
}

async function openTokenGenerationPage(message) {
  const { serverUrl } = message;
  const cleanedUrl = cleanServerUrl(serverUrl);
  ConnectionSettingsService.instance
    .generateToken(cleanedUrl)
    .then(async token => {
      await handleTokenReceivedNotification(token);
    })
    .catch(
      async _error =>
        await connectionSetupPanel.webview.postMessage({
          command: 'tokenGenerationPageIsOpen',
          errorMessage: 'Incorrect URL or server is not available'
        })
    );
  await connectionSetupPanel.webview.postMessage({ command: 'tokenGenerationPageIsOpen' });
}

async function saveConnection(connection: BaseConnection) {
  const isCloud = await isCodeScanCloudConnection(connection);
  if (!isCloud) {
    const foundConnection = await ConnectionSettingsService.instance.loadSonarQubeConnection(connection.connectionId);
    await connectionSetupPanel.webview.postMessage({ command: 'connectionCheckStart' });
    if (foundConnection) {
      await ConnectionSettingsService.instance.updateSonarQubeConnection(connection);
    } else {
      await ConnectionSettingsService.instance.addSonarQubeConnection(connection);
    }
  } else {
    const foundConnection = await ConnectionSettingsService.instance.loadSonarCloudConnection(connection.connectionId);
    await connectionSetupPanel.webview.postMessage({ command: 'connectionCheckStart' });
    if (foundConnection) {
      await ConnectionSettingsService.instance.updateSonarCloudConnection(connection);
    } else {
      await ConnectionSettingsService.instance.addSonarCloudConnection(connection);
    }
  }
}

async function isCodeScanCloudServer(message) {
  const { serverUrl } = message;
  const isCloud = await isCodeScanCloudConnection({serverUrl})  
  await connectionSetupPanel.webview.postMessage({ command: 'isCodeScanCloudServer', isCloud });
}

function cleanServerUrl(serverUrl: string) {
  return removeTrailingSlashes(serverUrl.trim());
}

export function removeTrailingSlashes(url: string) {
  let cleanedUrl = url;
  while (cleanedUrl.endsWith('/')) {
    cleanedUrl = cleanedUrl.substring(0, cleanedUrl.length - 1);
  }
  return cleanedUrl;
}

export async function handleTokenReceivedNotification(token: string) {
  if (connectionSetupPanel?.active && token) {
    await connectionSetupPanel.webview.postMessage({ command: TOKEN_RECEIVED_COMMAND, token });
  }
}

