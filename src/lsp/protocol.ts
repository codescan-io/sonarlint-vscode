/* --------------------------------------------------------------------------------------------
 * SonarLint for VisualStudio Code
 * Copyright (C) 2017-2023 SonarSource SA
 * sonarlint@sonarsource.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as lsp from 'vscode-languageserver-protocol';

//#region Client side extensions to LSP

export namespace ShowRuleDescriptionNotification {
  export const type = new lsp.NotificationType<ShowRuleDescriptionParams>('codescan/showRuleDescription');
}

export namespace SuggestBindingNotification {
  export const type = new lsp.NotificationType<SuggestBindingParams>('codescan/suggestBinding');
}

export interface SuggestBindingParams {
  suggestions: {
    [folderUri: string]: Array<BindingSuggestion>;
  };
}

export interface BindingSuggestion {
  connectionId: string;
  sonarProjectKey: string;
  sonarProjectName: string;
}

export namespace FindFileByNamesInFolderRequest {
  export const type = new lsp.RequestType<FindFileByNamesInFolderParams, FindFileByNamesInFolderResponse, void>(
    'codescan/findFileByNamesInFolder'
  );
}

export interface FindFileByNamesInFolderParams {
  folderUri: string;
  filenames: Array<string>;
}

export interface FindFileByNamesInFolderResponse {
  foundFiles: Array<FoundFileDto>;
}

export interface FoundFileDto {
  fileName: string;
  filePath: string;
  content: string;
}

export namespace ShowHotspotRuleDescriptionNotification {
  export const type = new lsp.NotificationType<ShowHotspotRuleDescriptionNotificationParams>(
    'codescan/showHotspotRuleDescription'
  );
}

export interface ShowHotspotRuleDescriptionNotificationParams {
  ruleKey: string;
  hotspotId: string;
  fileUri: string;
}

export interface ShowRuleDescriptionParams {
  key: string;
  name: string;
  htmlDescription: string;
  htmlDescriptionTabs: Array<{
    title: string;
    ruleDescriptionTabNonContextual?: {
      htmlContent: string;
    };
    ruleDescriptionTabContextual?: Array<{
      htmlContent: string;
      contextKey: string;
      displayName: string;
    }>;
    hasContextualInformation: boolean;
    defaultContextKey?: string;
  }>;
  type: string;
  severity: string;
  languageKey: string;
  isTaint: boolean;
  parameters?: Array<{
    name: string;
    description: string;
    defaultValue: string;
  }>;
}

export namespace GetJavaConfigRequest {
  export const type = new lsp.RequestType<string, GetJavaConfigResponse, void>('codescan/getJavaConfig');
}

export namespace ScmCheckRequest {
  export const type = new lsp.RequestType<string, boolean, void>('codescan/isIgnoredByScm');
}

export namespace ShowNotificationForFirstSecretsIssueNotification {
  export const type = new lsp.NotificationType('codescan/showNotificationForFirstSecretsIssue');
}

export namespace ShowNotificationForFirstCobolIssueNotification {
  export const type = new lsp.NotificationType('codescan/showNotificationForFirstCobolIssue');
}

export interface GetJavaConfigResponse {
  projectRoot: string;
  sourceLevel: string;
  classpath: string[];
  isTest: boolean;
  vmLocation: string;
}

export namespace ShowSonarLintOutputNotification {
  export const type = new lsp.NotificationType('codescan/showSonarLintOutput');
}

export namespace OpenJavaHomeSettingsNotification {
  export const type = new lsp.NotificationType('codescan/openJavaHomeSettings');
}

export namespace OpenPathToNodeSettingsNotification {
  export const type = new lsp.NotificationType('codescan/openPathToNodeSettings');
}

export namespace BrowseToNotification {
  export const type = new lsp.NotificationType<string>('codescan/browseTo');
}

export namespace OpenConnectionSettingsNotification {
  export const type = new lsp.NotificationType<boolean>('codescan/openConnectionSettings');
}

export enum HotspotResolution {
  Fixed,
  Safe,
  Acknowledged
}

export enum HotspotProbability {
  high,
  medium,
  low
}

export enum HotspotStatus {
  ToReview,
  Reviewed
}

export enum ExtendedHotspotStatus {
  ToReview,
  Safe,
  Fixed,
  Acknowledged
}

export interface RemoteHotspot {
  message: string;
  filePath: string;
  textRange: TextRange;
  author: string;
  status: HotspotStatus;
  resolution?: HotspotResolution;
  rule: {
    key: string;
    name: string;
    securityCategory: string;
    vulnerabilityProbability: HotspotProbability;
    riskDescription: string;
    vulnerabilityDescription: string;
    fixRecommendations: string;
  };
}

export namespace ShowHotspotNotification {
  export const type = new lsp.NotificationType<RemoteHotspot>('codescan/showHotspot');
}

export interface TextRange {
  startLine: number;
  endLine?: number;
  startLineOffset?: number;
  endLineOffset?: number;
}

export interface Location {
  uri?: string;
  filePath: string;
  textRange: TextRange;
  message?: string;
  exists: boolean;
  codeMatches: boolean;
}

export interface Flow {
  locations: Location[];
}

export interface Issue {
  fileUri: string;
  message: string;
  severity: string;
  ruleKey: string;
  connectionId?: string;
  creationDate?: string;
  flows: Flow[];
  textRange: TextRange;
}

export namespace ShowIssueOrHotspotNotification {
  export const type = new lsp.NotificationType<Issue>('codescan/showIssueOrHotspot');
}

export namespace GetBranchNameForFolderRequest {
  export const type = new lsp.RequestType<string, string, void>('codescan/getBranchNameForFolder');
}

export interface BranchNameForFolder {
  folderUri: string;
  branchName?: string;
}

export namespace SetReferenceBranchNameForFolderNotification {
  export const type = new lsp.NotificationType<BranchNameForFolder>('codescan/setReferenceBranchNameForFolder');
}

export namespace NeedCompilationDatabaseRequest {
  export const type = new lsp.NotificationType('codescan/needCompilationDatabase');
}

export namespace EditorOpenCheck {
  export const type = new lsp.RequestType<string, boolean, void>('codescan/isOpenInEditor');
}

export interface ConnectionCheckResult {
  connectionId: string;
  success: boolean;
  reason?: string;
}

export interface ConnectionCheckParams {
  connectionId: string;
}

export namespace ReportConnectionCheckResult {
  export const type = new lsp.NotificationType<ConnectionCheckResult>('codescan/reportConnectionCheckResult');
}

export namespace CheckConnection {
  export const type = new lsp.RequestType<ConnectionCheckParams, ConnectionCheckResult, void>(
    'codescan/checkConnection'
  );
}

export interface AnalysisFile {
  uri: string;
  languageId: string;
  version: number;
  text: string;
}

export interface CheckLocalDetectionSupportedResponse {
  isSupported: boolean;
  reason?: string;
}

export namespace CheckLocalDetectionSupported {
  export const type = new lsp.RequestType<FolderUriParams, CheckLocalDetectionSupportedResponse, null>(
    'codescan/checkLocalDetectionSupported'
  );
}

export namespace GetHotspotDetails {
  export const type = new lsp.RequestType<
    ShowHotspotRuleDescriptionNotificationParams,
    ShowRuleDescriptionParams,
    null
  >('codescan/getHotspotDetails');
}

//#endregion

//#region Server side extensions to LSP

export interface DidClasspathUpdateParams {
  projectUri: string;
}

export namespace DidClasspathUpdateNotification {
  export const type = new lsp.NotificationType<DidClasspathUpdateParams>('codescan/didClasspathUpdate');
}

export interface DidJavaServerModeChangeParams {
  serverMode: string;
}

export namespace DidJavaServerModeChangeNotification {
  export const type = new lsp.NotificationType<DidJavaServerModeChangeParams>('codescan/didJavaServerModeChange');
}

export interface DidLocalBranchNameChangeParams {
  folderUri: string;
  branchName?: string;
}

export namespace DidLocalBranchNameChangeNotification {
  export const type = new lsp.NotificationType<DidLocalBranchNameChangeParams>('codescan/didLocalBranchNameChange');
}

export type ConfigLevel = 'on' | 'off';

export interface Rule {
  readonly key: string;
  readonly name: string;
  readonly activeByDefault: boolean;
  levelFromConfig?: ConfigLevel;
}

export interface RulesResponse {
  [language: string]: Array<Rule>;
}

export namespace ListAllRulesRequest {
  export const type = new lsp.RequestType0<RulesResponse, void>('codescan/listAllRules');
}

export namespace GetTokenForServer {
  export const type = new lsp.RequestType<string, string, void>('codescan/getTokenForServer');
}

export namespace OnTokenUpdate {
  export const type = new lsp.NotificationType<void>('codescan/onTokenUpdate');
}

export interface GetRemoteProjectsForConnectionParams {
  connectionId: string;
}

export namespace GetRemoteProjectsForConnection {
  export const type = new lsp.RequestType<GetRemoteProjectsForConnectionParams, Map<string, string>, void>(
    'codescan/getRemoteProjectsForConnection'
  );
}

interface GetRemoteProjectNamesParams {
  connectionId?: string;
  projectKeys: Array<string>;
}

export namespace GetRemoteProjectNames {
  export const type = new lsp.RequestType<GetRemoteProjectNamesParams, { [key: string]: string }, null>(
    'codescan/getRemoteProjectNames'
  );
}

export interface GenerateTokenParams {
  baseServerUrl: string;
}

export interface GenerateTokenResponse {
  token?: string;
}

export namespace GenerateToken {
  export const type = new lsp.RequestType<GenerateTokenParams, GenerateTokenResponse, null>('codescan/generateToken');
}

export interface Range {
  line: number;
  character: number;
}

export interface Diagnostic extends lsp.Diagnostic {
  creationDate?: string;
  flows: Flow[];
}

export interface PublishHotspotsForFileParams {
  uri: string;
  diagnostics: Diagnostic[];
}

export namespace PublishHotspotsForFile {
  export const type = new lsp.NotificationType<PublishHotspotsForFileParams>('codescan/publishSecurityHotspots');
}

export interface ShowHotspotLocationsParams {
  hotspotKey: string;
  fileUri: string;
}

export namespace ShowHotspotLocations {
  export const type = new lsp.RequestType<ShowHotspotLocationsParams, null, null>('codescan/showHotspotLocations');
}

export interface OpenHotspotParams {
  hotspotId: string;
  fileUri: string;
}

export namespace OpenHotspotOnServer {
  export const type = new lsp.NotificationType<OpenHotspotParams>('codescan/openHotspotInBrowser');
}

export interface HelpAndFeedbackLinkClickedNotificationParams {
  id: string;
}

export namespace HelpAndFeedbackLinkClicked {
  export const type = new lsp.NotificationType<HelpAndFeedbackLinkClickedNotificationParams>(
    'codescan/helpAndFeedbackLinkClicked'
  );
}

export interface ScanFolderForHotspotsParams {
  folderUri: string;
  documents: Array<lsp.TextDocumentItem>;
}

export namespace ScanFolderForHotspots {
  export const type = new lsp.NotificationType<ScanFolderForHotspotsParams>('codescan/scanFolderForHotspots');
}

export namespace ForgetFolderHotspots {
  export const type = new lsp.NotificationType('codescan/forgetFolderHotspots');
}

export interface FolderUriParams {
  folderUri: string;
}

export interface GetFilePatternsForAnalysisResponse {
  patterns: string[];
}

export namespace GetFilePatternsForAnalysis {
  export const type = new lsp.RequestType<FolderUriParams, GetFilePatternsForAnalysisResponse, null>(
    'codescan/listSupportedFilePatterns'
  );
}

export interface GetSuggestedBindingParams {
  configScopeId: string;
  connectionId: string;
}

export interface GetSuggestedBindingResponse {
  suggestions: {
    [folderUri: string]: Array<BindingSuggestion>;
  };
}

export namespace GetSuggestedBinding {
  export const type = new lsp.RequestType<GetSuggestedBindingParams, GetSuggestedBindingResponse, null>(
    'codescan/getBindingSuggestion'
  );
}

export namespace AddIssueComment {
  export const type = new lsp.NotificationType<AddIssueCommentParams>('codescan/addIssueComment');
}

export interface AddIssueCommentParams {
  configurationScopeId: string;
  issueKey: string;
  text: string;
}

export namespace SetIssueStatus {
  export const type = new lsp.NotificationType<SetIssueStatusParams>('codescan/changeIssueStatus');
}

export interface SetIssueStatusParams {
  configurationScopeId: string;
  issueKey: string;
  newStatus: string;
  fileUri: string;
  isTaintIssue: boolean;
}

export interface AssistCreatingConnectionParams {
  isSonarCloud: boolean;
  serverUrl: string;
}

export namespace AssistCreatingConnection {
  export const type = new lsp.NotificationType<AssistCreatingConnectionParams>('codescan/assistCreatingConnection');
}

export interface AssistBindingParams {
  connectionId: string;
  projectKey: string;
}

export namespace AssistBinding {
  export const type = new lsp.NotificationType<AssistBindingParams>('codescan/assistBinding');
}

interface ShowHotspotDetailsParams {
  hotspotKey: string;
}

export namespace ShowHotspotDetails {
  export const type = new lsp.NotificationType<ShowHotspotDetailsParams>('codescan/showHotspotDetails');
}

export interface GetAllowedHotspotStatusesResponse {
  permitted: boolean;
  notPermittedReason: string;
  allowedStatuses: string[];
}

export interface GetAllowedHotspotStatusesParams {
  fileUri: string;
  folderUri: string;
  hotspotKey: string;
}

export namespace GetAllowedHotspotStatuses {
  export const type = new lsp.RequestType<GetAllowedHotspotStatusesParams, GetAllowedHotspotStatusesResponse, null>(
    'codescan/getAllowedHotspotStatuses'
  );
}

export interface SetHotspotStatusParams {
  hotspotKey: string;
  newStatus: string;
  fileUri: string;
}

export namespace SetHotspotStatus {
  export const type = new lsp.NotificationType<SetHotspotStatusParams>('codescan/changeHotspotStatus');
}

export interface SslCertificateConfirmationParams {
  issuedTo: string;
  issuedBy: string;
  validFrom: string;
  validTo: string;
  sha1Fingerprint: string;
  sha256Fingerprint: string;
  truststorePath: string;
}

export namespace SslCertificateConfirmation {
  export const type = new lsp.RequestType<SslCertificateConfirmationParams, boolean, void>(
    'codescan/askSslCertificateConfirmation');
}

//#endregion
