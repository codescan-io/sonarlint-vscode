/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
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
let unauthorizedConnectionErrorFlag: boolean;
let connectionWasSuccessful: boolean;
const TOKEN_RECEIVED_COMMAND = 'tokenReceived';
const OPEN_TOKEN_GENERATION_PAGE_COMMAND = 'openTokenGenerationPage';
const SAVE_CONNECTION_COMMAND = 'saveConnection';
const CHECK_CLOUD_COMMAND = 'checkIfCodeScanCloudUrl';

export function assistCreatingConnection(context: vscode.ExtensionContext) {
  return assistCreatingConnectionParams => {
   connectToCodeScanCloud(context)
  };
}

export function connectToCodeScanSelfHosted(context: vscode.ExtensionContext) {
  return serverUrl => {
    const initialState = {
      serverUrl: serverUrl && typeof serverUrl === 'string' ? serverUrl : '',
      token: '',
      connectionId: ''
    };
    const serverProductName = 'CodeScan Self-hosted';
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

export function editCodeScanConnection(context: vscode.ExtensionContext) {
  return async (connection: string | Promise<Connection>) => {
    const connectionId = typeof connection === 'string' ? connection : (await connection).id;
    const initialState = await ConnectionSettingsService.instance.loadCodeScanConnection(connectionId);
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
      if (!connectionWasSuccessful) {
        connectionWasSuccessful = true;
        vscode.window.showInformationMessage(`Connection with '${result.connectionId}' was successful!`);
      }
    } else {
      handleConnectionFailureUIMessaging(result);
    }
  }
}

async function handleConnectionFailureUIMessaging(result: ConnectionCheckResult) {
  if (!unauthorizedConnectionErrorFlag) {
    const editConnectionAction = 'Edit Connection';
    unauthorizedConnectionErrorFlag = true;
    const reply = await vscode.window.showErrorMessage(
      result.reason === 'Authentication failed'
      ? `Connection with '${result.connectionId}' failed because of authorization error. Please check your credentials.`
      : `Connection with '${result.connectionId}' failed. Please check your connection settings.`,
      editConnectionAction
    );
    if (reply === editConnectionAction) {
      vscode.commands.executeCommand(Commands.EDIT_CODESCAN_CONNECTION, result.connectionId);
    }
    unauthorizedConnectionErrorFlag = false;
  }
}

function lazyCreateConnectionSetupPanel(context: vscode.ExtensionContext, serverProductName) {
  if (!connectionSetupPanel) {
    connectionSetupPanel = vscode.window.createWebviewPanel(
      'codescan.ConnectionSetup',
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

  const serverProductName = 'CodeScan';

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
            title="A security token generated for your account on ${serverProductName}" value="${initialToken}">
            Token
          </vscode-text-field>
          <span id="tokenStatus" class="hidden">Token received!</span>
          <input type="hidden" id="token-initial" value="${initialToken}" />
        </div>
        ${renderOrganizationKeyField(initialState)}
        <vscode-text-field id="connectionId" type="text" placeholder="My ${serverProductName} Connection" size="40"
          title="Optionally, please give this connection a memorable and unique name. If no name is provided, CodeScan will try to generate one." 
          value="${initialConnectionId}"
          ${options.mode === 'update' ? 'readonly' : ''}>
          Unique Connection Name
        </vscode-text-field>
        <input type="hidden" id="connectionId-initial" value="${initialConnectionId}" />
        <input type="hidden" id="shouldGenerateConnectionId" value="${mode === 'create'}"/>
        ${renderNotificationsCheckbox(serverProductName, initialState)}
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

function renderNotificationsCheckbox(serverProductName, initialState) {
  return `<vscode-checkbox hidden id="enableNotifications" ${!initialState.disableNotifications ? 'checked' : ''}>
    Receive notifications from ${serverProductName}
  </vscode-checkbox>
  <input type="hidden" id="enableNotifications-initial" value="${!initialState.disableNotifications}" />
  `;
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
  let organizationKey = escapeHtml(connection.organizationKey);
  if (organizationKey === undefined) organizationKey = '';
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
    .then(async tokenObj => {
      await handleTokenReceivedNotification(tokenObj);
    })
    .catch(
      async _error =>
        await connectionSetupPanel.webview.postMessage({
          command: 'tokenGenerationPageIsOpen',
          errorMessage: 'Token generation already in progress or server is not available'
        })
    );
  await connectionSetupPanel.webview.postMessage({ command: 'tokenGenerationPageIsOpen' });
}

async function saveConnection(connection: BaseConnection) {
  connectionWasSuccessful = false;
  const foundConnection = await ConnectionSettingsService.instance.loadCodeScanConnection(connection.connectionId);
  await connectionSetupPanel.webview.postMessage({ command: 'connectionCheckStart' });
  if (foundConnection) {
    await ConnectionSettingsService.instance.updateCodeScanConnection(connection);
  } else {
    await ConnectionSettingsService.instance.addCodeScanConnection(connection);
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

export async function handleTokenReceivedNotification(tokenObj) {
  if (connectionSetupPanel?.active && tokenObj.token) {
    await connectionSetupPanel.webview.postMessage({ command: TOKEN_RECEIVED_COMMAND, tokenObj });
  }
}

