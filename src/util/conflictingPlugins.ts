/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { Commands } from './commands';

interface ConflictingPlugin {
    name: string;
    pluginId: string;
}

const CONFLICTING_PLUGIN_IDS : ConflictingPlugin[] = [
    {pluginId: 'SonarSource.sonarlint-vscode', name: 'SonarLint'},
    {pluginId: 'chuckjonas.apex-pmd', name: 'Apex PMD'},
    {pluginId: 'mohanChinnappan.apex-pmd-code-scanner', name: 'VSCode Apex PMD'}
];

export function detectConflictingPlugins() {
    // Specify the conflicting extension IDs
    const installedExtensions = vscode.extensions.all;

    const conflictingExtensions = CONFLICTING_PLUGIN_IDS.filter(extension =>
        installedExtensions.some(conflict => conflict.id === extension.pluginId)
    );

    if (conflictingExtensions.length <= 0) {
        return;
    }

    const conflictingExtensionNames = conflictingExtensions.map(extension => extension.name);

    let extensions = '';
    if (conflictingExtensionNames.length > 1) {
        // If there is more than one conflicting extension
        const lastExtension = conflictingExtensionNames.pop(); // Remove the last element
        extensions += conflictingExtensionNames.join(', ') + ' and ' + lastExtension;
    } else {
        extensions += conflictingExtensionNames[0];
    }

    const error = {
        label: 'Manage Extensions',
        disableMessage: 'Unsupported extensions detected',
        message: `We have detected that you currently have ${extensions} installed.\n 
        It is necessary to uninstall these extensions to ensure optimal functionality of the Codescan extension. 
        Please be aware that uninstalling these extensions may impact your existing configurations and settings.`,
        command: 'workbench.view.extensions'
    }

    vscode.window.showErrorMessage(error.message, error.label).then(selection => {
        if (error.label && error.label === selection && error.command) {
            vscode.commands.executeCommand('workbench.view.extensions');
        }
    });
    throw new Error(error.disableMessage);
}