/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { expect } from 'chai';
import { connectionFailureMessage, describeConnectionFailure, ipAllowlistMessage } from '../../src/connected/ipAllowlist';

const MSG = "Access to organization 'acme' is blocked by its IP allowlist. Your IP address is 203.0.113.9.";
const REASON_403 = `HTTP Connection failed (403): {"errors":[{"msg":"${MSG}"}]}`;
const ADVICE = 'Ask an administrator of the organization to add your network to the IP allowlist.';

suite('ipAllowlist', () => {
  test('extracts the message from a 403 connection-check reason', () => {
    expect(ipAllowlistMessage(REASON_403)).to.equal(MSG);
  });

  test('decodes the escaped quotes the server sends', () => {
    const body = String.raw`{"errors":[{"msg":"Access to organization 'acme' is blocked by its IP allowlist. Your IP address is 203.0.113.9."}]}`;
    expect(ipAllowlistMessage(`HTTP Connection failed (403): ${body}`)).to.equal(MSG);
  });

  test('returns a plain reason that already is the message', () => {
    expect(ipAllowlistMessage(MSG)).to.equal(MSG);
  });

  test('ignores other reasons', () => {
    expect(ipAllowlistMessage('Authentication failed')).to.be.undefined;
    expect(ipAllowlistMessage('HTTP Connection failed (500): Foo')).to.be.undefined;
    expect(ipAllowlistMessage(undefined)).to.be.undefined;
  });

  test('describes a blocked check for the setup panel and leaves other reasons unchanged', () => {
    expect(describeConnectionFailure(REASON_403)).to.equal(`${MSG} ${ADVICE}`);
    expect(describeConnectionFailure('Authentication failed')).to.equal('Authentication failed');
    expect(describeConnectionFailure(undefined)).to.be.undefined;
  });

  test('pop-up text names the block instead of the generic advice', () => {
    expect(connectionFailureMessage({ connectionId: 'acme', reason: REASON_403 }))
      .to.equal(`Connection with 'acme' failed. ${MSG} ${ADVICE}`);
    expect(connectionFailureMessage({ connectionId: 'acme', reason: 'Authentication failed' }))
      .to.equal("Connection with 'acme' failed because of authorization error. Please check your credentials.");
    expect(connectionFailureMessage({ connectionId: 'acme', reason: 'HTTP Connection failed (500): Foo' }))
      .to.equal("Connection with 'acme' failed. Please check your connection settings.");
  });
});
