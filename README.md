# CodeScan for Visual Studio Code

CodeScan is a Visual Studio Code extension that provides on-the-fly feedback to developers on new bugs and quality issues injected into Apex and VisualForce code.

## How it works

Simply open a Apex or VisualForce file, start coding, and you will start seeing issues reported by CodeScan. Issues are highlighted in your code, and also listed in the 'Problems' panel.

![sonarlint on-the-fly](images/sonarlint-vscode.gif)

You can access the detailed rule description directly from your editor, using the provided contextual menu.

![rule description](images/sonarlint-rule-description.gif)

You can find all available rules descriptions on the dedicated [CodeScan website](http://www.code-scan.com/vscode).

## Requirements

The only thing you need is a Java Runtime (JRE) 8 installed on your computer and SonarQube installed

CodeScan should automatically find it but you can also explicitely set the path where the JRE is installed using the 'codescan.ls.javaHome' variable in VS Code settings. For example 

    {
        "codescan.ls.javaHome": "C:\Program Files\Java\jre1.8.0_131"
    }

## Contributions and license

CodeScan for Visual Studio Code is open source under the LGPL v3 license. Feel free to submit Pull Requests.

## Feedback

The preferred way to discuss about CodeScan is by posting on the [SonarLint Support Page](http://www.code-scan.com/help/support). Feel free to ask questions, report issues, and give suggestions.
