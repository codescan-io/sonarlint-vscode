/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2023 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

/**
 * Commonly used commands
 */
export namespace Commands {
  /**
   * Open Browser
   */
  export const OPEN_BROWSER = 'vscode.open';

  /**
   * Open settings.json
   */
  export const OPEN_JSON_SETTINGS = 'workbench.action.openSettingsJson';

  /**
   * Open settings
   */
  export const OPEN_SETTINGS = 'workbench.action.openSettings';

  export const DEACTIVATE_RULE = 'CodeScan.DeactivateRule';
  export const ACTIVATE_RULE = 'CodeScan.ActivateRule';
  export const SHOW_ALL_RULES = 'CodeScan.ShowAllRules';
  export const SHOW_ACTIVE_RULES = 'CodeScan.ShowActiveRules';
  export const SHOW_INACTIVE_RULES = 'CodeScan.ShowInactiveRules';
  export const SHOW_SONARLINT_OUTPUT = 'CodeScan.ShowCodeScanOutput';
  export const OPEN_RULE_BY_KEY = 'CodeScan.OpenRuleByKey';
  export const FIND_RULE_BY_KEY = 'CodeScan.FindRuleByKey';
  export const SHOW_ALL_LOCATIONS = 'CodeScan.ShowAllLocations';
  export const CLEAR_LOCATIONS = 'CodeScan.ClearLocations';
  export const NAVIGATE_TO_LOCATION = 'CodeScan.NavigateToLocation';

  export const INSTALL_MANAGED_JRE = 'CodeScan.InstallManagedJre';

  export const HIDE_HOTSPOT = 'CodeScan.HideHotspot';
  export const SHOW_HOTSPOT_DESCRIPTION = 'SonarLint.ShowHotspotDescription';
  export const CONFIGURE_COMPILATION_DATABASE = 'CodeScan.ConfigureCompilationDatabase';

  export const CONNECT_TO_CODESCAN = 'CodeScan.ConnectToCodeScan';
  export const CONNECT_TO_CODESCAN_SELF_HOSTED = 'CodeScan.ConnectToCodeScanSelfHosted';
  export const EDIT_SONARQUBE_CONNECTION = 'CodeScan.EditCodeScanSHConnection';
  export const EDIT_CODESCAN_CONNECTION = 'CodeScan.EditCodeScanCloudConnection';
  export const REMOVE_CONNECTION = 'CodeScan.RemoveConnection';

  export const ADD_PROJECT_BINDING = 'CodeScan.AddProjectBinding';
  export const EDIT_PROJECT_BINDING = 'CodeScan.EditProjectBinding';
  export const REMOVE_PROJECT_BINDING = 'CodeScan.RemoveProjectBinding';

  export const SHOW_HOTSPOT_LOCATION = 'CodeScan.ShowHotspotLocation';
  export const SHOW_HOTSPOT_RULE_DESCRIPTION = 'CodeScan.ShowHotspotRuleDescription';
  export const SHOW_HOTSPOT_DETAILS = 'CodeScan.ShowHotspotDetails';
  export const OPEN_HOTSPOT_ON_SERVER = 'CodeScan.OpenHotspotOnServer';
  export const HIGHLIGHT_REMOTE_HOTSPOT_LOCATION = 'CodeScan.HighlightRemoteHotspotLocation';
  export const CLEAR_HOTSPOT_HIGHLIGHTING = 'CodeScan.ClearHotspotLocations';
  export const SHOW_HOTSPOTS_IN_OPEN_FILES = 'CodeScan.ShowHotspotsInOpenFiles';
  export const SCAN_FOR_HOTSPOTS_IN_FOLDER = 'CodeScan.ScanForHotspotsInFolder';
  export const FORGET_FOLDER_HOTSPOTS = 'CodeScan.ForgetFolderHotspots';

  export const RESOLVE_ISSUE = 'CodeScan.ResolveIssue';
  export const TRIGGER_HELP_AND_FEEDBACK_LINK = 'CodeScan.HelpAndFeedbackLinkClicked';
  export const CHANGE_HOTSPOT_STATUS = 'CodeScan.ChangeHotspotStatus';
  export const ENABLE_VERBOSE_LOGS = 'CodeScan.EnableVerboseLogs';
  export const UPDATE_ALL_BINDINGS = 'CodeScan.UpdateAllBindings';
}
