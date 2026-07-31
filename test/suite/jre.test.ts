/* --------------------------------------------------------------------------------------------
 * CodeScan for VisualStudio Code
 * Copyright (C) 2017-2024 SonarSource SA
 * support@codescan.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { buildUrl, unzip, DownloadResponse } from '../../src/java/jre';
import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';

suite('jre', () => {
  suite('buildUrl', () => {
    test('should use defaults', () => {
      expect(buildUrl({ os: 'linux', architecture: 'x64' }))
        .equal('https://api.adoptopenjdk.net/v2/binary/releases/openjdk11?openjdk_impl=hotspot&os=linux&arch=x64&type=jre&heap_size=normal&release=latest');
    });

    test('should override defaults', () => {
      expect(buildUrl({ os: 'windows', architecture: 'x32', version: 13, binary: 'jdk' }))
        .equal('https://api.adoptopenjdk.net/v2/binary/releases/openjdk13?openjdk_impl=hotspot&os=windows&arch=x32&type=jdk&heap_size=normal&release=latest');
    });
  });

  suite('unzip', () => {
    let workDir: string;

    setup(() => {
      workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jre-unzip-'));
    });

    teardown(() => {
      // fs.rmSync exists at runtime (Node 14+); cast around the stale @types/node@10 pin.
      (fs as { rmSync?: (p: string, o: object) => void }).rmSync?.(workDir, { recursive: true, force: true });
    });

    // Create <workDir>/fixture/<rootName>/<innerRelPath> as a regular file, return the fixture parent dir.
    function makeFixture(rootName: string, innerRelPath: string): string {
      const fixtureParent = path.join(workDir, `fixture-${rootName}`);
      const filePath = path.join(fixtureParent, rootName, innerRelPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, 'fake-binary');
      return fixtureParent;
    }

    function downloadResponse(targetOs: 'windows' | 'linux' | 'mac', archiveName: string): DownloadResponse {
      const destinationDir = path.join(workDir, targetOs);
      fs.mkdirSync(destinationDir, { recursive: true });
      return {
        jreZipPath: path.join(destinationDir, archiveName),
        destinationDir,
        options: { os: targetOs, architecture: 'x64' }
      };
    }

    test('extracts a .tgz on linux and returns the extracted jre home', async () => {
      const fixtureParent = makeFixture('jdk-17-linux', path.join('bin', 'java'));
      const dr = downloadResponse('linux', 'jre.tgz');
      execSync(`tar -czf "${dr.jreZipPath}" -C "${fixtureParent}" jdk-17-linux`);

      const javaHome = (await unzip(dr)) as string;

      expect(javaHome).to.equal(path.join(dr.destinationDir, 'jre', 'jdk-17-linux'));
      expect(fs.existsSync(path.join(javaHome, 'bin', 'java'))).to.equal(true);
      expect(fs.existsSync(dr.jreZipPath)).to.equal(false); // archive removed after extraction
    });

    test('extracts a .zip on windows and returns the extracted jre home', async () => {
      const fixtureParent = makeFixture('jdk-17-win', path.join('bin', 'java.exe'));
      const dr = downloadResponse('windows', 'jre.zip');
      execSync(`zip -r -q "${dr.jreZipPath}" jdk-17-win`, { cwd: fixtureParent });

      const javaHome = (await unzip(dr)) as string;

      expect(javaHome).to.equal(path.join(dr.destinationDir, 'jre', 'jdk-17-win'));
      expect(fs.existsSync(path.join(javaHome, 'bin', 'java.exe'))).to.equal(true);
      expect(fs.existsSync(dr.jreZipPath)).to.equal(false);
    });

    test('returns the Contents/Home java home for a mac .tgz', async () => {
      const fixtureParent = makeFixture('jdk-17-mac', path.join('Contents', 'Home', 'bin', 'java'));
      const dr = downloadResponse('mac', 'jre.tgz');
      execSync(`tar -czf "${dr.jreZipPath}" -C "${fixtureParent}" jdk-17-mac`);

      const javaHome = (await unzip(dr)) as string;

      expect(javaHome).to.equal(path.join(dr.destinationDir, 'jre', 'jdk-17-mac', 'Contents', 'Home'));
      expect(fs.existsSync(path.join(javaHome, 'bin', 'java'))).to.equal(true);
      expect(fs.existsSync(dr.jreZipPath)).to.equal(false);
    });
  });
});
