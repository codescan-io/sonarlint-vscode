/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

const vscode = acquireVsCodeApi();

window.addEventListener('load', init);
window.addEventListener('message', handleMessage);

function byId(elementId) {
  return document.getElementById(elementId);
}

function init() {
  byId('connectionId').addEventListener('change', onChangeConnectionId);
  byId('connectionId').addEventListener('keyup', onChangeConnectionId);
  const serverUrl = byId('serverUrl');
  if (serverUrl) {
    serverUrl.addEventListener('change', onChangeServerUrl);
    serverUrl.addEventListener('keyup', onChangeServerUrl);
    serverUrl.addEventListener('blur', onBlurServerUrl);
  }
  const organizationKey = byId('organizationKey');
  if (organizationKey) {
    organizationKey.addEventListener('change', onChangeOrganizationKey);
    organizationKey.addEventListener('keyup', onChangeOrganizationKey);
  }
  byId('generateToken').addEventListener('click', onClickGenerateToken);
  byId('token').addEventListener('change', onChangeToken);
  byId('token').addEventListener('keyup', onChangeToken);
  byId('enableNotifications').addEventListener('change', onChangeEnableNotifications);
  byId('saveConnection').addEventListener('click', onClickSaveConnection);
  tryRestoreState();
}

function onChangeConnectionId() {
  // If connection ID is manually changed, we should stop updating it when the URL changes
  byId('shouldGenerateConnectionId').value = 'false';
  saveState();
  toggleSaveConnectionButton();
}

function onChangeServerUrl() {
  saveState();
  if (byId('shouldGenerateConnectionId').value === 'true') {
    byId('connectionId').value = sanitize(byId('serverUrl').value);
  }
  toggleGenerateTokenButton();
  toggleSaveConnectionButton();
}

function onBlurServerUrl() {
  if (hasValidServerUrl()) {
    checkIfUrlIsCloud()();
  }
}

function onChangeOrganizationKey() {
  saveState();
  if (byId('shouldGenerateConnectionId').value === 'true') {
    byId('connectionId').value = sanitize(byId('organizationKey').value);
  }
  toggleSaveConnectionButton();
}

function toggleGenerateTokenButton() {
  byId('generateToken').disabled = byId('serverUrl') && !hasValidServerUrl();
}

function toggleOrganizationKeyInputField(message) {
  byId('organizationKey').hidden = !message.isCloud;
}

function hasValidRequiredField() {
  return hasValidServerUrl() && hasValidOrganizationKey() && hasValidConnectionId();
}

function checkIfUrlIsCloud() {
  /**
   * @type {HTMLInputElement}
   */
  const serverUrlElement = byId('serverUrl');
  const serverUrl = serverUrlElement ? serverUrlElement.value : 'https://app.codescan.io';
  vscode.postMessage({
    command: 'checkIfCodeScanCloudUrl',
    serverUrl
  });
}

function hasValidServerUrl() {
  /**
   * @type {HTMLInputElement}
   */
  const serverUrlInput = byId('serverUrl');
  return serverUrlInput.validity.valid && isValidUrl(serverUrlInput.value);
}

function isValidUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return /^https?:$/.test(parsedUrl.protocol);
  } catch(e) {
    return false;
  }
}

function hasValidOrganizationKey() {
  /**
   * @type {HTMLInputElement}
   */
  const organizationKeyInput = byId('organizationKey');
  return organizationKeyInput.hidden || organizationKeyInput.validity.valid;
}

function hasValidConnectionId() {
  /**
   * @type {HTMLInputElement}
   */
  const connectionIdInput = byId('connectionId');
  return connectionIdInput.validity.valid;
}

function onClickGenerateToken() {
  /**
   * @type {HTMLInputElement}
   */
  const serverUrlElement = byId('serverUrl');
  const serverUrl = serverUrlElement ? serverUrlElement.value : 'https://app.codescan.io';
  byId('tokenGenerationProgress').classList.remove('hidden');
  vscode.postMessage({
    command: 'openTokenGenerationPage',
    serverUrl
  });
}


function onChangeToken() {
  saveState();
  toggleSaveConnectionButton();
}

function hasValidToken() {
  /**
   * @type {HTMLInputElement}
   */
  const token = byId('token');
  return token.validity.valid && token.value.length > 0;
}

function toggleSaveConnectionButton() {
  byId('saveConnection').disabled = !hasUnsavedChanges() || !hasValidRequiredField() || !hasValidToken();
}

function onChangeEnableNotifications() {
  saveState();
  toggleSaveConnectionButton();
}

function onClickSaveConnection() {
  const connectionId = byId('connectionId').value;
  const token = byId('token').value;
  const disableNotifications = !byId('enableNotifications').checked;
  const saveConnectionMessage = {
    command: 'saveConnection',
    connectionId,
    token,
    disableNotifications
  };
  const serverUrl = byId('serverUrl');
  if (serverUrl) {
    saveConnectionMessage.serverUrl = serverUrl.value;
  }
  const organizationKey = byId('organizationKey');
  if (organizationKey) {
    saveConnectionMessage.organizationKey = organizationKey.value;
  }
  vscode.postMessage(saveConnectionMessage);
}

function tryRestoreState() {
  const previousState = vscode.getState();
  if (previousState) {
    Object.entries(previousState).forEach(tryRestore);
    byId('enableNotifications').checked = previousState.enableNotifications;
  }
  toggleGenerateTokenButton();
  toggleSaveConnectionButton();
}

function tryRestore(keyValuePair) {
  const [key, value] = keyValuePair;
  const element = byId(key);
  if (element) {
    element.value = value;
  }
}

function saveState() {
  const stateToSave = {};
  for (const elementId of ['connectionId', 'organizationKey', 'serverUrl', 'token', 'shouldGenerateConnectionId']) {
    /**
     * @type {HTMLInputElement}
     */
    const inputElement = byId(elementId);
    if (inputElement) {
      const value = inputElement.value;
      if (value) {
        stateToSave[elementId] = value;
      }
    }
  }
  stateToSave.enableNotifications = byId('enableNotifications').checked;
  vscode.setState(stateToSave);
}

function hasUnsavedChanges() {
  /**
   * @type {HTMLInputElement}
   */
  const enableNotifications = byId('enableNotifications');
  const enableNotificationsInitial = (byId('enableNotifications-initial').value === 'true');
  const enableNotificationsHasChanged = (enableNotifications.checked !== enableNotificationsInitial);
  return enableNotificationsHasChanged ||
      ['connectionId', 'organizationKey', 'serverUrl', 'token'].some(hasChanged);
}

function hasChanged(elementId) {
  /**
   * @type {HTMLInputElement}
   */
  const element = byId(elementId);
  /**
   * @type {HTMLInputElement}
   */
  const initial = byId(`${elementId}-initial`);
  return element && initial && (element.value !== initial.value);
}

function handleMessage(event) {
  const message = event.data;
  switch (message.command) {
    case 'connectionCheckStart':
      connectionCheckStart();
      break;
    case 'connectionCheckSuccess':
      connectionCheckSuccess();
      break;
    case 'connectionCheckFailure':
      connectionCheckFailure(message.reason);
      break;
    case 'tokenReceived':
      populateTokenField(message.tokenObj);
      break;
    case 'tokenGenerationPageIsOpen':
      tokenGenerationPageIsOpen(message.errorMessage);
      break;
    case 'isCodeScanCloudServer':
      toggleOrganizationKeyInputField(message);
      break;
  }
}

function connectionCheckStart() {
  byId('connectionProgress').classList.remove('hidden');
  byId('connectionStatus').innerText = 'Checking connection...';
}

function connectionCheckSuccess() {
  byId('tokenStatus').classList.add('hidden');
  byId('connectionProgress').classList.add('hidden');
  byId('connectionStatus').innerText = 'Success!';
  byId('saveConnection').disabled = true;
}

function connectionCheckFailure(reason) {
  byId('tokenStatus').classList.add('hidden');
  byId('connectionProgress').classList.add('hidden');
  byId('connectionStatus').innerText = `Failed: ${reason}`;
}

function populateTokenField(tokenObj) {
  byId('token').value = tokenObj.token;
  if (tokenObj.organizationKey) {
    byId('organizationKey').value = tokenObj.organizationKey;
  }
  byId('tokenStatus').innerText = 'Token Received!';
  byId('tokenStatus').classList.remove('hidden');
  byId('tokenGenerationResult').innerText = '';
  toggleSaveConnectionButton();
  saveState();
}

function tokenGenerationPageIsOpen(errorMessage) {
  byId('tokenGenerationResult').innerText = '';
  byId('tokenGenerationProgress').classList.add('hidden');
  if (errorMessage) {
    byId('tokenGenerationResult').innerText = errorMessage;
  }
}

function sanitize(serverUrl) {
  return (serverUrl || '').replace(/[^a-z\d]+/gi, '-');
}
