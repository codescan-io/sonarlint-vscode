/* --------------------------------------------------------------------------------------------
 * SonarLint for VisualStudio Code
 * Copyright (C) 2017-2023 SonarSource SA
 * sonarlint@sonarsource.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as VSCode from 'vscode';
import { Connection } from '../connected/connections';
import { SonarLintExtendedLanguageClient } from '../lsp/client';
import { logToSonarLintOutput } from '../util/logging';
import { removeTrailingSlashes } from '../connected/connectionsetup';

const SONARLINT_CATEGORY = 'sonarlint';
const CONNECTIONS_SECTION = 'connectedMode.connections';
const SONARQUBE = 'sonarqube';
const SONARCLOUD = 'sonarcloud';
const SONARQUBE_CONNECTIONS_CATEGORY = `${SONARLINT_CATEGORY}.${CONNECTIONS_SECTION}.${SONARQUBE}`;
const SONARCLOUD_CONNECTIONS_CATEGORY = `${SONARLINT_CATEGORY}.${CONNECTIONS_SECTION}.${SONARCLOUD}`;

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

async function suggestMigrationToSecureStorage(
  sqConnections: BaseConnection[],
  scConnections: BaseConnection[],
  settingsService: ConnectionSettingsService
) {
  const remindMeLaterAction = 'Ask me later';
  const migrateToSecureStorageAction = 'Migrate';
  const message = `SonarLint found SonarQube/SonarCloud token in settings file.
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
    private readonly client: SonarLintExtendedLanguageClient
  ) {}

  static init(context: VSCode.ExtensionContext, client: SonarLintExtendedLanguageClient): void {
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
   * @param serverUrlOrOrganizationKey SonarQube URL or SonarCloud organization ID
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
      .getConfiguration(SONARLINT_CATEGORY)
      .get<BaseConnection[]>(`${CONNECTIONS_SECTION}.${SONARQUBE}`);
  }

  setSonarQubeConnections(sqConnections: BaseConnection[]) {
    VSCode.workspace
      .getConfiguration()
      .update(SONARQUBE_CONNECTIONS_CATEGORY, sqConnections, VSCode.ConfigurationTarget.Global);
  }

  getSonarQubeConnectionForUrl(serverUrl: string): BaseConnection | undefined {
    return this.getSonarQubeConnections().find(c => c.serverUrl === serverUrl);
  }

  async addSonarQubeConnection(connection: BaseConnection) {
    const connections = this.getSonarQubeConnections();
    const newConnection: BaseConnection = { serverUrl: connection.serverUrl };
    if (connection.connectionId !== undefined) {
      newConnection.connectionId = connection.connectionId;
    }
    if (connection.disableNotifications) {
      newConnection.disableNotifications = true;
    }
    await this.storeConnectionToken(connection, connection.token);
    connections.push(newConnection);
    VSCode.workspace
      .getConfiguration()
      .update(SONARQUBE_CONNECTIONS_CATEGORY, connections, VSCode.ConfigurationTarget.Global);
  }

  async updateSonarQubeConnection(connection: BaseConnection) {
    const connections = this.getSonarQubeConnections();
    const connectionToUpdate = connections.find(c => c.connectionId === connection.connectionId);
    if (!connectionToUpdate) {
      throw new Error(`Could not find connection '${connection.connectionId}' to update`);
    }
    connectionToUpdate.serverUrl = connection.serverUrl;
    if (connection.disableNotifications) {
      connectionToUpdate.disableNotifications = true;
    } else {
      delete connectionToUpdate.disableNotifications;
    }
    await this.storeConnectionToken(connection, connection.token);
    await this.client.onTokenUpdate();
    delete connectionToUpdate.token;
    VSCode.workspace
      .getConfiguration()
      .update(SONARQUBE_CONNECTIONS_CATEGORY, connections, VSCode.ConfigurationTarget.Global);
  }

  getSonarCloudConnections(): BaseConnection[] {
    return VSCode.workspace
      .getConfiguration(SONARLINT_CATEGORY)
      .get<BaseConnection[]>(`${CONNECTIONS_SECTION}.${SONARCLOUD}`);
  }

  getSonarCloudConnectionForOrganization(organization: string): BaseConnection | undefined {
    return this.getSonarCloudConnections().find(c => c.organizationKey === organization);
  }

  setSonarCloudConnections(scConnections: BaseConnection[]) {
    VSCode.workspace
      .getConfiguration()
      .update(SONARCLOUD_CONNECTIONS_CATEGORY, scConnections, VSCode.ConfigurationTarget.Global);
  }

  async addSonarCloudConnection(connection: BaseConnection) {
    const connections = this.getSonarCloudConnections();
    const newConnection: BaseConnection = { organizationKey: connection.organizationKey, serverUrl: connection.serverUrl };
    if (connection.connectionId !== undefined) {
      newConnection.connectionId = connection.connectionId;
    }
    if (connection.disableNotifications) {
      newConnection.disableNotifications = true;
    }
    await this.storeConnectionToken(connection, connection.token);
    connections.push(newConnection);
    VSCode.workspace
      .getConfiguration()
      .update(SONARCLOUD_CONNECTIONS_CATEGORY, connections, VSCode.ConfigurationTarget.Global);
  }

  async updateSonarCloudConnection(connection: BaseConnection) {
    const connections = this.getSonarCloudConnections();
    const connectionToUpdate = connections.find(c => c.connectionId === connection.connectionId);
    if (!connectionToUpdate) {
      throw new Error(`Could not find connection '${connection.connectionId}' to update`);
    }
    connectionToUpdate.organizationKey = connection.organizationKey;
    if (connection.disableNotifications) {
      connectionToUpdate.disableNotifications = true;
    } else {
      delete connectionToUpdate.disableNotifications;
    }
    await this.storeConnectionToken(connection, connection.token);
    await this.client.onTokenUpdate();
    delete connectionToUpdate.token;
    VSCode.workspace
      .getConfiguration()
      .update(SONARCLOUD_CONNECTIONS_CATEGORY, connections, VSCode.ConfigurationTarget.Global);
  }

  async addTokensFromSettingsToSecureStorage(
    sqConnections: BaseConnection[],
    scConnections: BaseConnection[]
  ) {
    await Promise.all(
      [...sqConnections, ...scConnections].map(async c => {
        if (c.token !== undefined && !(await this.hasTokenForConnection(c))) {
          await this.storeConnectionToken(c, c.token);
          c.token = undefined;
        }
      })
    );
    await updateConfigIfNotEmpty(sqConnections, SONARQUBE_CONNECTIONS_CATEGORY);
    await updateConfigIfNotEmpty(scConnections, SONARCLOUD_CONNECTIONS_CATEGORY);
  }

  async loadSonarQubeConnection(connectionId: string) {
    const allSonarQubeConnections = this.getSonarQubeConnections();
    const loadedConnection = allSonarQubeConnections.find(c => c.connectionId === connectionId);
    if (loadedConnection) {
      loadedConnection.token = await this.getServerToken(loadedConnection.serverUrl);
    }
    return loadedConnection;
  }

  async loadSonarCloudConnection(connectionId: string) {
    const allSonarCloudConnections = this.getSonarCloudConnections();
    const loadedConnection = allSonarCloudConnections.find(c => c.connectionId === connectionId);
    if (loadedConnection) {
      loadedConnection.token = await this.getServerToken(loadedConnection.organizationKey);
    }
    return loadedConnection;
  }

  async removeConnection(connectionItem: Promise<Connection>) {
    const connection = await connectionItem;

    const isSonarQube = connection.contextValue === 'sonarqubeConnection';

    const deleteAction = 'Delete';
    const confirm = await VSCode.window.showWarningMessage(
      `Are you sure you want to delete ${isSonarQube ? 'SonarQube' : 'SonarCloud'} connection '${
        connection.id
      }' and project bindings related to it?`,
      { modal: true },
      deleteAction
    );
    if (confirm !== deleteAction) {
      return false;
    }

    if (isSonarQube) {
      const sqConnections = this.getSonarQubeConnections();
      const matchingConnectionIndex = sqConnections.findIndex(c => c.connectionId === connection.id);
      if (matchingConnectionIndex === -1) {
        showSaveSettingsWarning();
        return false;
      }
      const foundConnection = sqConnections[matchingConnectionIndex];
      await this.deleteTokenForConnection(foundConnection);
      sqConnections.splice(matchingConnectionIndex, 1);
      this.setSonarQubeConnections(sqConnections);
    } else {
      const scConnections = this.getSonarCloudConnections();
      const matchingConnectionIndex = scConnections.findIndex(c => c.connectionId === connection.id);
      if (matchingConnectionIndex === -1) {
        showSaveSettingsWarning();
        return false;
      }
      const foundConnection = scConnections[matchingConnectionIndex];
      await this.deleteTokenForConnection(foundConnection);
      scConnections.splice(matchingConnectionIndex, 1);
      this.setSonarCloudConnections(scConnections);
    }
    return true;
  }

  async generateToken(baseServerUrl: string) {
    const { token } = await this.client.generateToken(baseServerUrl);
    if (!token) {
      logToSonarLintOutput(`Could not automatically generate server token for generation params: ${baseServerUrl}`);
    }
    return token;
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
}

export async function isCodeScanCloudConnection(connection : BaseConnection) {
  const serverUrl = connection.serverUrl;
  if (!serverUrl) return false;
  if (serverUrl.includes("codescan.io")) return true;

  const isCloud = await checkIfCloudApiExistForServer(serverUrl);
  return isCloud;
}

async function checkIfCloudApiExistForServer(serverUrl) {
  const CODESCAN_HEALTH_ENDPOINT = removeTrailingSlashes(serverUrl) + "/_codescan/actuator/health";
  try {
    const response = await fetch(CODESCAN_HEALTH_ENDPOINT);

    if (!response.ok) {
      console.debug(`isCodeScanCloudAlias health check request for host: ${serverUrl} failed with status code: ${response.status}.`);
      return false;
    }

    try {
      const responseBody = await response.json();
      if (responseBody.status === "UP") {
        return true;
      } else {
        console.debug(`isCodeScanCloudAlias health check request for host: ${serverUrl} returned JSON with unexpected status: ${responseBody.status}.`);
      }
    } catch (jsonError) {
      console.debug(`isCodeScanCloudAlias health check request for host: ${serverUrl} returned invalid JSON.`);
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function getTokenStorageKey(connection: BaseConnection) {
  return await isCodeScanCloudConnection(connection) ? connection.organizationKey : connection.serverUrl;
}

async function updateConfigIfNotEmpty(connections, configCategory) {
  if (connections.length > 0) {
    await VSCode.workspace.getConfiguration().update(configCategory, connections, VSCode.ConfigurationTarget.Global);
  }
}
