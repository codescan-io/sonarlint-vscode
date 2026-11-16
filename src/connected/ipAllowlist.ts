/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

const MARKER = 'is blocked by its IP allowlist';
export const IP_ALLOWLIST_ADVICE = 'Ask an administrator of the organization to add your network to the IP allowlist.';

/** The server's "blocked by its IP allowlist" text inside a connection-check reason, if there is one. */
export function ipAllowlistMessage(reason?: string): string | undefined {
  if (!reason?.includes(MARKER)) {
    return undefined;
  }
  const json = reason.indexOf('{');
  if (json >= 0) {
    try {
      const errors: { msg?: string }[] = JSON.parse(reason.substring(json)).errors ?? [];
      const hit = errors.find(e => e.msg?.includes(MARKER));
      if (hit?.msg) {
        return hit.msg;
      }
    } catch {
      // not JSON after all; fall back to the raw reason
    }
  }
  return reason;
}

/** The text to show for a failed connection check: the allowlist block with advice, or the reason unchanged. */
export function describeConnectionFailure(reason?: string): string | undefined {
  const blocked = ipAllowlistMessage(reason);
  return blocked ? `${blocked} ${IP_ALLOWLIST_ADVICE}` : reason;
}

/** The pop-up text for a failed connection check when the setup panel is not open. */
export function connectionFailureMessage(result: { connectionId?: string; reason?: string }): string {
  const blocked = ipAllowlistMessage(result.reason);
  if (blocked) {
    return `Connection with '${result.connectionId}' failed. ${blocked} ${IP_ALLOWLIST_ADVICE}`;
  }
  return result.reason === 'Authentication failed'
    ? `Connection with '${result.connectionId}' failed because of authorization error. Please check your credentials.`
    : `Connection with '${result.connectionId}' failed. Please check your connection settings.`;
}
