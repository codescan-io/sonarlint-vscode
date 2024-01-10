/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2023 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { expect } from 'chai';
import { buildBaseServerUrl } from '../../src/util/bindingUtils';

suite('Binding Utils Test Suite', () => {

  test('should build base server url', () => {
    const sqBaseServerUrl = buildBaseServerUrl('SonarQube', 'serverUrl');
    const scBaseServerUrl = buildBaseServerUrl('SonarCloud', 'orgKey');

    expect(sqBaseServerUrl).to.be.equal('serverUrl/dashboard');
    expect(scBaseServerUrl).to.be.equal('https://app.codescan.io/project/overview');
  });
});
