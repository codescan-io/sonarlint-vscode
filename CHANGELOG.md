## 1.6.10
* Fixed compatibility issues with Sonarqube 8.9+ LTS
* For Java analysis, Language Support for Java(TM) by Red Hat extension (version 0.56.0 or higher) is required.
* Codescan ouput default log level set to INFO. Added settings options to change log level.

## 1.6.8
* Fixed compatibility issue with Sonarqube 8.9 LTS for Javascript plugin

## 1.6.7
* Fixed compatibility issue with CodeScan Cloud 22.1

## 1.6.6
* Added support of Sonarqube 8.9 LTS

## 1.6.5
* Included SonarCSS 4.19

## 1.6.0

* Update SonarPHP 2.14 -> [2.15](https://jira.sonarsource.com/secure/ReleaseNote.jspa?projectId=10956&version=14493) -> [2.16](https://jira.sonarsource.com/secure/ReleaseNote.jspa?projectId=10956&version=14751)
* Update SonarPython 1.10 -> [1.12](https://jira.sonarsource.com/secure/ReleaseNote.jspa?projectId=10958&version=14849)
* Update SonarTS 1.7 -> [1.8](https://github.com/SonarSource/SonarTS/milestone/14?closed=1) -> [1.9](https://github.com/SonarSource/SonarTS/milestone/15?closed=1)
* Update SonarJS 4.2 -> [5.0](https://github.com/SonarSource/SonarJS/milestone/11?closed=1) -> [5.1](https://github.com/SonarSource/SonarJS/milestone/13?closed=1)
* Add support for HTML and JSP (using SonarHTML analyzer)

## 1.5.0

* Report secondary issue locations as [related diagnostics information](https://code.visualstudio.com/updates/v1_22#_support-related-diagnostics-information)
* Update SonarJS 4.1 -> [4.2](https://github.com/SonarSource/SonarJS/milestone/10?closed=1)
* Update SonarPHP 2.13 -> [2.14](https://jira.sonarsource.com/jira/secure/ReleaseNote.jspa?projectId=10956&version=14346)
* The language server can run with Java 10

## 1.4.0

* Update SonarTS 1.6 -> [1.7](https://github.com/SonarSource/SonarTS/milestone/13?closed=1)

## 1.3.0

* Add basic support for connected mode
  * Track server issues and hide resolved
  * Add command to update bindings and sync
* Add basic support for multi-root workspace
* Update embedded analyzers
  * SonarJS 4.0 -> 4.1
  * SonarTS 1.5 -> 1.6
  * SonarPHP 2.12 -> 2.13
  * SonarPython 1.8 -> 1.10

## 1.2.8
* Support python, php and javascript
* Don't depend on apex/visualforce

## 1.2.5
* Support organizations

## 1.2.2
* Support for CodeScan plugin via fork of code
* Support for Connected Mode

## 1.2.0

* Add support for TypeScript (using SonarTS analyzer)
* Update SonarJS to [version 4.0](https://github.com/SonarSource/sonar-javascript/milestone/8?closed=1)
  * Support Vue.js single file components
  * Flow syntax support
  * Exclude node_modules folder
  * Many rules improvements
* Update SonarPHP to [version 2.12](https://jira.sonarsource.com/secure/ReleaseNote.jspa?projectId=10956&version=14064)
  * Support for PHP 7.1 and 7.2
  * Many new rules and rules improvements

## 1.1.0

* Update SonarJS to [version 3.1](https://github.com/SonarSource/sonar-javascript/milestone/4?closed=1)
  * 1 new rule
* Display rule description directly inside VSCode

## 1.0.0

* First release
* On-the-fly analysis of JavaScript, Python and PHP
* SonarJS 3.0
* SonarPHP 2.10
* SonarPython 1.8
