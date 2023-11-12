# Code Anchor for VSCode

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/DiscreteTom.code-anchor?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=DiscreteTom.code-anchor)
![license](https://img.shields.io/github/license/DiscreteTom/vscode-anchor?style=flat-square)

Quickly navigate to anchors in your code.

![demo](./img/demo.png)

## Features

- Syntax highlighting for anchors and references.
- Completion for references.
- Hover for details.
- Goto definition.
- Find all references.
- Customizable anchor regex.

## Usage

Create a definition/anchor in any file using the following syntax:

```
[[some words here]]
```

Then reference it in any file:

```
[[@some words here]]
```

## Customize

You can customize the definition/reference syntax in the extension settings by providing a regex pattern.

## Credit

Inspired by [bimark](https://github.com/DiscreteTom/bimark).

## [CHANGELOG](./CHANGELOG.md)
