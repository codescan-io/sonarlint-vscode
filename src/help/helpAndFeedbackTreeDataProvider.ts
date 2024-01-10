/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2023 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as VSCode from 'vscode';
import { Commands } from '../util/commands';

export interface HelpAndFeedbackItem {
  id: string;
  label: string;
  url: string;
  icon: string;
}

export const helpAndFeedbackViewItems: HelpAndFeedbackItem[] = [
  {
    id: 'docs',
    label: 'Read Documentation',
    url: 'https://knowledgebase.autorabit.com/product-guides/codescan',
    icon: 'book'
  },
  {
    id: 'getHelp',
    label: 'Get Help | Report Issue',
    url: 'https://knowledgebase.autorabit.com/product-guides/codescan/codescan-support/contact-support-team',
    icon: 'comment-discussion'
  },
  {
    id: 'supportedRules',
    label: 'See Languages & Rules',
    url: 'https://knowledgebase.autorabit.com/product-guides/codescan/quality-rules/codescan-rule-list',
    icon: 'checklist'
  },
  {
    id: 'whatsNew',
    label: "Check What's New",
    url: 'https://knowledgebase.autorabit.com/overview/release-notes/codescan-release-notes',
    icon: 'megaphone'
  },
  {
    id: 'faq',
    label: 'Review FAQ',
    url: 'https://knowledgebase.autorabit.com/product-guides/codescan/frequently-asked-questions',
    icon: 'question'
  }
];

export function getHelpAndFeedbackItemById(id: string): HelpAndFeedbackItem {
  return helpAndFeedbackViewItems.find(i => i.id === id);
}

export class HelpAndFeedbackLink extends VSCode.TreeItem {
  constructor(public readonly id) {
    const itemById = getHelpAndFeedbackItemById(id);
    super(itemById.label, VSCode.TreeItemCollapsibleState.None);
    this.iconPath = new VSCode.ThemeIcon(itemById.icon);
    this.command = {
      command: Commands.TRIGGER_HELP_AND_FEEDBACK_LINK,
      title: 'Trigger Help and Feedback Link',
      arguments: [itemById]
    };
  }
}

export class HelpAndFeedbackTreeDataProvider implements VSCode.TreeDataProvider<HelpAndFeedbackLink> {
  private readonly _onDidChangeTreeData = new VSCode.EventEmitter<HelpAndFeedbackLink | undefined>();
  readonly onDidChangeTreeData: VSCode.Event<HelpAndFeedbackLink | undefined> = this._onDidChangeTreeData.event;

  refresh() {
    this._onDidChangeTreeData.fire(null);
  }

  getChildren(element?: HelpAndFeedbackLink): HelpAndFeedbackLink[] {
    return helpAndFeedbackViewItems.map(item => new HelpAndFeedbackLink(item.id));
  }

  getTreeItem(element: HelpAndFeedbackLink): VSCode.TreeItem {
    return element;
  }
}
