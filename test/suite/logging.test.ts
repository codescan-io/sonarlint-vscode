/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { expect } from 'chai';
import * as vscode from 'vscode';
import { createRedactingOutputChannel, redactSecrets } from '../../src/util/logging';

const TOKEN = 'squ_0123456789abcdef0123456789abcdef01234567';

suite('logging', () => {

  test('should mask sonar.login in analysis configuration dump', () => {
    const message = `extraProperties: {codescan.ide.type=VSCode, sonar.cfamily.compile-commands=, sonar.organization=myorg, ` +
      `sonar.host.url=https://app.codescan.io, sonar.login=${TOKEN}}`;

    const redacted = redactSecrets(message);

    expect(redacted).to.not.contain(TOKEN);
    expect(redacted).to.contain('sonar.login=******}');
    expect(redacted).to.contain('sonar.organization=myorg');
    expect(redacted).to.contain('sonar.host.url=https://app.codescan.io');
  });

  test('should mask sonar.token and sonar.password properties', () => {
    expect(redactSecrets('sonar.token=abc, x=y')).to.equal('sonar.token=******, x=y');
    expect(redactSecrets('sonar.password=secret')).to.equal('sonar.password=******');
  });

  test('should mask tokens in JSON payloads', () => {
    const message = `{"connectionId":"c1","token":"${TOKEN}","organizationKey":"myorg"}`;

    const redacted = redactSecrets(message);

    expect(redacted).to.equal('{"connectionId":"c1","token":"******","organizationKey":"myorg"}');
  });

  test('should mask raw tokens anywhere', () => {
    expect(redactSecrets(`Using ${TOKEN} for auth`)).to.equal('Using squ_****** for auth');
  });

  test('should leave messages without secrets untouched', () => {
    const message = `Analyzing file 'file:///tmp/Foo.cls'...`;
    expect(redactSecrets(message)).to.equal(message);
  });

  test('redacting output channel should mask everything written to it', () => {
    const written: string[] = [];
    const fakeChannel = {
      name: 'fake',
      append: (v: string) => written.push(v),
      appendLine: (v: string) => written.push(v),
      replace: (v: string) => written.push(v),
      clear: () => { /* NOP */ },
      show: () => { /* NOP */ },
      hide: () => { /* NOP */ },
      dispose: () => { /* NOP */ }
    } as vscode.OutputChannel;

    const channel = createRedactingOutputChannel(fakeChannel);
    channel.append(`sonar.login=${TOKEN}`);
    channel.appendLine(`"token": "${TOKEN}"`);
    channel.replace(TOKEN);

    expect(channel.name).to.equal('fake');
    expect(written).to.deep.equal(['sonar.login=******', '"token": "******"', 'squ_******']);
  });

});
