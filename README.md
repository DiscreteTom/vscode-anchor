# Code Anchor for VSCode

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/DiscreteTom.code-anchor?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=DiscreteTom.code-anchor)
![license](https://img.shields.io/github/license/DiscreteTom/vscode-anchor?style=flat-square)

Quickly navigate to anchors in your code.

![demo](./img/demo.png)

## Installation

Via VSCode Marketplace: [Code Anchor](https://marketplace.visualstudio.com/items?itemName=DiscreteTom.code-anchor).

## Features

- Syntax highlighting for anchors and references.
- Completion for references.
- Hover for details.
- Goto definition.
- Find all references.
- Rename definitions.
- [Customizable](#customize).
- Fast. Powered by [`ripgrep`](https://github.com/BurntSushi/ripgrep).

## Usage

Create a definition/anchor in any file using the following syntax:

```
[[some words here]]
```

Then reference it in any file:

```
[[@some words here]]
```

> [!NOTE]
> Files in `.gitignore` are ignored.

## Customize

These options are customizable via VSCode's settings.

- Definition pattern.
- Reference pattern.
- Completion prefix pattern.
- Completion trigger characters.
- Diagnostic severity.

## Credit

Inspired by [bimark](https://github.com/DiscreteTom/bimark).

## [CHANGELOG](./CHANGELOG.md)
