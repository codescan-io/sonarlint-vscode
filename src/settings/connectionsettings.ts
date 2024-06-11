/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as VSCode from 'vscode';
import { Connection } from '../connected/connections';
import { CodeScanExtendedLanguageClient } from '../lsp/client';
import { logToCodeScanOutput } from '../util/logging';
import { removeTrailingSlashes } from '../connected/connectionsetup';

const CODESCAN_CATEGORY = 'codescan';
const CONNECTIONS_SECTION = 'connectedMode.connections';
const SERVERS = 'servers';

// For migration
const SONARQUBE = 'sonarqube';
const SONARCLOUD = 'sonarcloud';
const CODESCAN_CONNECTIONS_CATEGORY = `${CODESCAN_CATEGORY}.${CONNECTIONS_SECTION}.${SERVERS}`;

async function hasUnmigratedConnections(
  sqConnections: BaseConnection[],
  scConnections: BaseConnection[],
  settingsService: ConnectionSettingsService
): Promise<boolean> {
  for (const connection of [...sqConnections, ...scConnections]) {
    if (!(await settingsService.hasTokenForConnection(connection)) && connection.token) {
      return true;
    }
  }
  return false;
}

export async function migrateConnectedModeSettings(
  settings: VSCode.WorkspaceConfiguration,
  settingsService: ConnectionSettingsService
) {
  const sqConnections = settings.get<BaseConnection[]>(`${CONNECTIONS_SECTION}.${SONARQUBE}`, []);
  const scConnections = settings.get<BaseConnection[]>(`${CONNECTIONS_SECTION}.${SONARCLOUD}`, []);
  if (await hasUnmigratedConnections(sqConnections, scConnections, settingsService)) {
    suggestMigrationToSecureStorage(sqConnections, scConnections, settingsService);
  }
}

export async function migrateDeprecatedSettings(
  settings: VSCode.WorkspaceConfiguration,
  settingsService: ConnectionSettingsService
) {
  const scOldConnections = settings.get<BaseConnection[]>(SERVERS, []);
  scOldConnections.forEach((conn, index) => {
    // Old id was serverId so put it in connId
    if (!conn.connectionId) 
      conn.connectionId = conn.serverId + (index + 1);
  })
  if (await hasUnmigratedConnections([], scOldConnections, settingsService)) {
    suggestMigrationToSecureStorage([], scOldConnections, settingsService);
  }
}

async function suggestMigrationToSecureStorage(
  sqConnections: BaseConnection[],
  scConnections: BaseConnection[],
  settingsService: ConnectionSettingsService
) {
  const remindMeLaterAction = 'Ask me later';
  const migrateToSecureStorageAction = 'Migrate';
  const message = `CodeScan found token in settings file.
   Do you want to migrate them to secure storage?`;
  const selection = await VSCode.window.showWarningMessage(message, migrateToSecureStorageAction, remindMeLaterAction);
  if (selection === migrateToSecureStorageAction) {
    await settingsService.addTokensFromSettingsToSecureStorage(sqConnections, scConnections);
  }
}

export class ConnectionSettingsService {
  private static _instance: ConnectionSettingsService;

  constructor(
    private readonly secretStorage: VSCode.SecretStorage,
    private readonly client: CodeScanExtendedLanguageClient
  ) {}

  static init(context: VSCode.ExtensionContext, client: CodeScanExtendedLanguageClient): void {
    ConnectionSettingsService._instance = new ConnectionSettingsService(context.secrets, client);
  }

  static get instance(): ConnectionSettingsService {
    return ConnectionSettingsService._instance;
  }

  async storeConnectionToken(connection: BaseConnection, token: string) {
    await this.storeServerToken(await getTokenStorageKey(connection), token);
  }

  /**
   *
   * @param serverUrlOrOrganizationKey CodeScan Self-hosted URL or CodeScan organization ID
   * @param token auth token
   */
  async storeServerToken(serverUrlOrOrganizationKey: string, token: string): Promise<void> {
    if (token) {
      this.secretStorage.store(serverUrlOrOrganizationKey, token);
    }
  }

  async getServerToken(serverUrlOrOrganizationKey: string): Promise<string | undefined> {
    return this.secretStorage.get(serverUrlOrOrganizationKey);
  }

  async hasTokenForConnection(connection: BaseConnection) {
    return this.hasTokenForServer(await getTokenStorageKey(connection));
  }

  async hasTokenForServer(serverUrlOrOrganizationKey: string): Promise<boolean> {
    try {
      const serverToken = await this.getServerToken(serverUrlOrOrganizationKey);
      return serverToken !== undefined;
    } catch (errorWhileFetchingToken) {
      return false;
    }
  }

  async deleteTokenForConnection(connection: BaseConnection): Promise<void> {
    return this.deleteTokenForServer(await getTokenStorageKey(connection));
  }

  async deleteTokenForServer(serverUrlOrOrganizationKey: string): Promise<void> {
    return this.secretStorage.delete(serverUrlOrOrganizationKey);
  }

  getSonarQubeConnections(): BaseConnection[] {
    return VSCode.workspace
      .getConfiguration(CODESCAN_CATEGORY)
      .get<BaseConnection[]>(`${CONNECTIONS_SECTION}.${SONARQUBE}`);
  }

  getCodeScanConnections(): BaseConnection[] {
    return VSCode.workspace
      .getConfiguration(CODESCAN_CATEGORY)
      .get<BaseConnection[]>(`${CONNECTIONS_SECTION}.${SERVERS}`);
  }

  getCodeScanConnectionForOrganization(organization: string): BaseConnection | undefined {
    return this.getCodeScanConnections().find(c => c.organizationKey === organization);
  }

  setCodeScanConnections(scConnections: BaseConnection[]) {
    VSCode.workspace
      .getConfiguration()
      .update(CODESCAN_CONNECTIONS_CATEGORY, scConnections, VSCode.ConfigurationTarget.Global);
  }

  async addCodeScanConnection(connection: BaseConnection) {
    const isCloud = await ConnectionSettingsService.instance.isCodeScanCloudConnection(connection);
    const connections = this.getCodeScanConnections();
    const newConnection: BaseConnection = { serverUrl: connection.serverUrl, isCloudConnection: isCloud };
    if (isCloud) {
      newConnection.organizationKey = connection.organizationKey;
    }
    if (connection.connectionId !== undefined) {
      newConnection.connectionId = connection.connectionId;
    }
    if (connection.disableNotifications) {
      newConnection.disableNotifications = true;
    }
    await this.storeConnectionToken(newConnection, connection.token);
    connections.push(newConnection);
    VSCode.workspace
      .getConfiguration()
      .update(CODESCAN_CONNECTIONS_CATEGORY, connections, VSCode.ConfigurationTarget.Global);
  }

  async updateCodeScanConnection(connection: BaseConnection) {
    const isCloud = await ConnectionSettingsService.instance.isCodeScanCloudConnection(connection);
    const connections = this.getCodeScanConnections();
    const connectionToUpdate = connections.find(c => c.connectionId === connection.connectionId);
    if (!connectionToUpdate) {
      throw new Error(`Could not find connection '${connection.connectionId}' to update`);
    }

    connectionToUpdate.serverUrl = connection.serverUrl;
    connectionToUpdate.isCloudConnection = isCloud;
    if (isCloud) {
      connectionToUpdate.organizationKey = connection.organizationKey;
    }
    
    if (connection.disableNotifications) {
      connectionToUpdate.disableNotifications = true;
    } else {
      delete connectionToUpdate.disableNotifications;
    }
    await this.storeConnectionToken(connectionToUpdate, connection.token);
    await this.client.onTokenUpdate();
    delete connectionToUpdate.token;
    VSCode.workspace
      .getConfiguration()
      .update(CODESCAN_CONNECTIONS_CATEGORY, connections, VSCode.ConfigurationTarget.Global);
  }

  async addTokensFromSettingsToSecureStorage(
    sqConnections: BaseConnection[],
    scConnections: BaseConnection[]
  ) {
    await Promise.all(
      [...sqConnections, ...scConnections].map(async c => {
        if (c.token !== undefined && !(await this.hasTokenForConnection(c))) {
          const isCloud = await ConnectionSettingsService.instance.isCodeScanCloudConnection(c);
          c.isCloudConnection = isCloud;
          await this.storeConnectionToken(c, c.token);
          c.token = undefined;
        }
      })
    );
    await deleteDeprecatedConnectionsInConfig(scConnections, `${CODESCAN_CATEGORY}.${SERVERS}`)
    await updateConfigIfNotEmpty(scConnections, CODESCAN_CONNECTIONS_CATEGORY);
  }

  async loadSonarQubeConnection(connectionId: string) {
    const allSonarQubeConnections = this.getSonarQubeConnections();
    const loadedConnection = allSonarQubeConnections.find(c => c.connectionId === connectionId);
    if (loadedConnection) {
      loadedConnection.token = await this.getServerToken(loadedConnection.serverUrl);
    }
    return loadedConnection;
  }

  async loadCodeScanConnection(connectionId: string) {
    const allCodeScanConnections = this.getCodeScanConnections();
    const loadedConnection = allCodeScanConnections.find(c => c.connectionId === connectionId);
    if (loadedConnection) {
      loadedConnection.token = await this.getServerToken(loadedConnection.isCloudConnection ? loadedConnection.organizationKey : loadedConnection.serverUrl);
    }
    return loadedConnection;
  }

  async removeConnection(connectionItem: Promise<Connection>) {
    const connection = await connectionItem;

    const deleteAction = 'Delete';
    const confirm = await VSCode.window.showWarningMessage(
      `Are you sure you want to delete 'CodeScan' connection '${
        connection.id
      }' and project bindings related to it?`,
      { modal: true },
      deleteAction
    );
    if (confirm !== deleteAction) {
      return false;
    }

    const scConnections = this.getCodeScanConnections();
    const matchingConnectionIndex = scConnections.findIndex(c => c.connectionId === connection.id);
    if (matchingConnectionIndex === -1) {
      showSaveSettingsWarning();
      return false;
    }
    const foundConnection = scConnections[matchingConnectionIndex];
    await this.deleteTokenForConnection(foundConnection);
    scConnections.splice(matchingConnectionIndex, 1);
    this.setCodeScanConnections(scConnections);
    
    return true;
  }

  async generateToken(baseServerUrl: string) {
    const tokenObj = await this.client.generateToken(baseServerUrl);
    if (!tokenObj) {
      logToCodeScanOutput(`Could not automatically generate server token for generation params: ${baseServerUrl}`);
    }
    return tokenObj;
  }

  async isCodeScanCloudConnection(connection : BaseConnection) {
    const serverUrl = connection.serverUrl;
    if (!serverUrl) return false;

    logToCodeScanOutput("Checking if host url provided is cloud or self-hosted: " + serverUrl);
    const cloudConnection = await this.client.checkIfConnectionIsCloud(serverUrl);
    return cloudConnection ? cloudConnection.isCloudConnection : false; 
  }
}

function showSaveSettingsWarning() {
  const saveSettings =
    'You are trying to delete connection with modified settings file.' +
    ' Please save your settings file and try again.';
  VSCode.window.showWarningMessage(saveSettings);
}

export interface BaseConnection {
  token?: string;
  connectionId?: string;
  disableNotifications?: boolean;
  serverUrl?: string;
  organizationKey?: string;
  isCloudConnection?: boolean;
  serverId?: string;
}

async function getTokenStorageKey(connection: BaseConnection) {
  return connection.isCloudConnection ? connection.organizationKey : connection.serverUrl;
}

async function updateConfigIfNotEmpty(connections, configCategory) {
  if (connections.length > 0) {
    await VSCode.workspace.getConfiguration().update(configCategory, connections, VSCode.ConfigurationTarget.Global);
  }
}

async function deleteDeprecatedConnectionsInConfig(migratedConnections, configCategory) {
  if (migratedConnections.length > 0) {
    await VSCode.workspace.getConfiguration().update(configCategory, undefined, VSCode.ConfigurationTarget.Global);
  }
}
