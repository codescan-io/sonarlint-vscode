/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { expect } from 'chai';
import * as vscode from 'vscode';
import {
  createTokenMaskingOutputChannel,
  maskToken,
  maskTokens,
  registerTokenForMasking
} from '../../src/util/logging';

const TOKEN = 'squ_0123456789abcdef0123456789abcdef01234567';
const MASKED_TOKEN = 'squ_01' + '*'.repeat(TOKEN.length - 6);

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

  test('should mask sonar.login in analysis configuration dump', () => {
    const message =
      'extraProperties: {codescan.ide.type=VSCode, sonar.cfamily.compile-commands=, sonar.organization=myorg, ' +
      `sonar.host.url=https://app.codescan.io, sonar.login=${TOKEN}}`;

    const masked = maskTokens(message);

    expect(masked).to.not.contain(TOKEN);
    expect(masked).to.contain(`sonar.login=${MASKED_TOKEN}}`);
    expect(masked).to.contain('sonar.organization=myorg');
    expect(masked).to.contain('sonar.host.url=https://app.codescan.io');
  });

  test('should mask sonar.token and fully mask passwords', () => {
    expect(maskTokens('sonar.token=abcdefghij, x=y')).to.equal('sonar.token=abcdef****, x=y');
    expect(maskTokens('sonar.password=secret123')).to.equal('sonar.password=*********');
    expect(maskTokens('{"password":"secret123"}')).to.equal('{"password":"*********"}');
  });

  test('should mask unregistered raw tokens anywhere', () => {
    expect(maskTokens(`Using ${TOKEN} for auth`)).to.equal(`Using ${MASKED_TOKEN} for auth`);
  });

  test('should leave messages without secrets untouched', () => {
    const message = `Analyzing file 'file:///tmp/Foo.cls'...`;
    expect(maskTokens(message)).to.equal(message);
  });

  test('masking output channel should mask everything written to it', () => {
    const written: string[] = [];
    const fakeChannel = {
      name: 'fake',
      append: (v: string) => written.push(v),
      appendLine: (v: string) => written.push(v),
      replace: (v: string) => written.push(v),
      clear: () => {
        /* NOP */
      },
      show: () => {
        /* NOP */
      },
      hide: () => {
        /* NOP */
      },
      dispose: () => {
        /* NOP */
      }
    } as vscode.OutputChannel;

    const channel = createTokenMaskingOutputChannel(fakeChannel);
    channel.append(`sonar.login=${TOKEN}`);
    channel.appendLine(`"token": "${TOKEN}"`);
    channel.replace(TOKEN);

    expect(channel.name).to.equal('fake');
    expect(written).to.deep.equal([`sonar.login=${MASKED_TOKEN}`, `"token": "${MASKED_TOKEN}"`, MASKED_TOKEN]);
  });
});
