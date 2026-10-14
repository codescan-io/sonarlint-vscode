/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { expect } from 'chai';
import { maskToken, maskTokens, registerTokenForMasking } from '../../src/util/logging';

suite('logging', () => {
  test('should keep first 6 characters of a token and mask the rest', () => {
    expect(maskToken('abcdef123456')).to.equal('abcdef******');
    expect(maskToken('abcdefg')).to.equal('abcdef*');
  });

  test('should fully mask tokens of 6 characters or fewer', () => {
    expect(maskToken('abcdef')).to.equal('******');
    expect(maskToken('')).to.equal('');
  });

  test('should mask token fields in message traces', () => {
    const trace = 'Result: {\n    "token": "squ_1234567890abcdef",\n    "serverUrl": "https://app.codescan.io"\n}';
    expect(maskTokens(trace)).to.equal(
      'Result: {\n    "token": "squ_12**************",\n    "serverUrl": "https://app.codescan.io"\n}'
    );
  });

  test('should mask registered tokens wherever they appear', () => {
    registerTokenForMasking('registeredSecret987');
    expect(maskTokens('Result: "registeredSecret987"')).to.equal('Result: "regist*************"');
    expect(maskTokens('nothing secret here')).to.equal('nothing secret here');
  });
});
