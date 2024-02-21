# CodeScan for Visual Studio Code

CodeScan is a Visual Studio Code extension that provides on-the-fly feedback to developers on new bugs and quality issues injected into Apex and VisualForce code.

## How it works

Simply open a Apex or VisualForce file, start coding, and you will start seeing issues reported by CodeScan. Issues are highlighted in your code, and also listed in the 'Problems' panel.

![codescan on-the-fly](images/codescan-vscode.gif)

You can access the detailed rule description directly from your editor, using the provided contextual menu.

![rule description](images/codescan-rule-description.gif)

You can find all available rules descriptions on the dedicated [CodeScan Knowledgebase](https://knowledgebase.autorabit.com/product-guides/codescan/quality-rules/codescan-rule-list)

## Requirements

The CodeScan language server needs a Java Runtime (JRE) 17+.


If a Java runtime is already installed on your computer, CodeScan should automatically find and use it. Here is how CodeScan will search for an installed JRE (in priority order):

1. the `codescan.ls.javaHome` variable in VS Code settings if set. For instance:

   ```json
   {
     "codescan.ls.javaHome": "C:\\Program Files\\Java\\jre-11.0.11"
   }
   ```

2. embedded JRE for platform-specific installations
3. the value of the `JDK_HOME` environment variable if set
4. the value of the `JAVA_HOME` environment variable if set
5. on Windows the registry is queried
6. if a JRE is still not found then:
   1. the `PATH` is scanned for `javac`
   2. on macOS, the parent directory of `javac` is checked for a `java_home` binary. If that binary exists then it is executed and the result is used
   3. the grandparent directory of `javac` is used. This is similar to `$(dirname $(dirname $(readlink $(which javac))))`

CodeScan then uses the first JRE found in these steps to check its version.

If a suitable JRE cannot be found at those places, CodeScan will ask for your permission to download and manage its own version.

### JS/TS analysis specific requirements

To analyze JavaScript and TypeScript code, CodeScan requires Node.js executable. The minimal supported version is `14.17.0` for standalone analysis in CodeScan Cloud. For CodeScan Self-hosted, it depends on the version of the JS/TS analyzer on your SonarQube server. CodeScan will attempt to automatically locate node, or you can force the location using:

```json
{
  "codescan.pathToNodeExecutable": "/home/yourname/.nvm/versions/node/v14.17.0/bin/node"
}
```

Analysis of TypeScript in CodeScan Cloud requires the server to use version 8.1 or above.

### Java analysis specific requirements

To enable the support for Java analysis, you need the [Language support for Java](https://marketplace.visualstudio.com/items?itemName=redhat.java) VSCode extension (version 0.56.0 or higher). You also need to be in [standard mode](https://code.visualstudio.com/docs/java/java-project#_lightweight-mode).


## Connected Mode

You can connect CodeScan to SonarQube 7.9+/CodeScanCloud by binding your VSCode workspace folder to your CodeScan project(s), and benefit from the same rules and settings that are used to inspect your project on the server. CodeScan in VSCode then hides **Won’t Fix** and **False Positive** issues in any file from a bound folder.


## Connection Setup

In v3.8 and above of CodeScan for VSCode, to set up CodeScan connections, navigate to the **CODESCAN** > **CONNECTED MODE** view container in the VS Code Activity Bar.

<img src='images/connected_mode_treeview.png' alt='Empty Connected Mode View' width='400'/>

Select **Add CodeScan Connection**, and complete the fields. If your connection is to a self-hosted Codescan, you do not need to input organization-key.

<img src='images/create_view.png' alt='Create Connection View' width='600'/>

User Token can be generated using these pages:

- CodeScan Self-hosted - `https://<your-codescan-url>/account/security/`
- CodeScan - `https://app.codescan.io/account/security/`

**Unique Connection Name** is a friendly name for your connections. In the case of multiple connections, it also acts as a `connectionId`.

Select **Save Connection** and verify that the new connection was set up successfully in the Connected Mode view.

### Project Binding

CodeScan keeps server-side data in a local storage. If you change something on the server such as the Quality Profile, CodeScan will automatically attempt to synchronize with configured servers at startup & once every hour, and will do its best to synchronize with the most appropriate branch from the server. Additionally, you can trigger an update of the local storage using the "CodeScan: Update all project bindings to CodeScan" command on the command palette. 

### Project Binding Setup

From v3.10, CodeScan for VSCode tries to automatically detect a remote CodeScan project to bind with the locally opened workspace folder. If no remote match is found, you will be prompted to configure binding manually.

To manually configure a project binding, open the **CONNECTED MODE** view and select **Add Project Binding** for the desired connection.

<img src='images/add-binding.png' alt='Add Project Binding' width='500'/>

If your open workspace contains multiple folders, you will be prompted to choose a specific folder.

<img src='images/3.8_selectFolder.png' alt='Select Folder' width='500'/>

After selecting the folder, choose the remote CodeScan project you would like to bind.

<img src='images/3.8_selectProject.png' alt='Select Project' width='500'/>

Select the desired project and enjoy Connected Mode! You can also edit or delete bindings from the **CONNECTED MODE** view.

<img src='https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FGZNGL3oDkXu3pPCzA5Vv%2Fuploads%2Fk8KNO1yApjCS9EDhXyDr%2Fedit-binding.png?alt=media&token=9a14d097-3e45-4790-bf3f-a8a2fe19a85a' alt='Edit Binding' width='500'/>
<img src='images/3.8_selectProject.png' alt='Edit Binding' width='500'/>

Action buttons in the UI used to edit/delete existing, or create additional bindings will be revealed when hovering over each connection.


## Have Questions or Feedback?

For CodeScan support questions ("How do I?", "I got this error, why?", ...), please first read the [FAQ](https://knowledgebase.autorabit.com/product-guides/codescan/codescan-integration/ide-plugins/).


## License

Copyright 2017-2024 CodeScan.

Licensed under the [GNU Lesser General Public License, Version 3.0](http://www.gnu.org/licenses/lgpl.txt)