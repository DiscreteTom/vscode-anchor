# CHANGELOG

## v0.2.3

- Feat: scan for unused definitions. Can be disabled by setting `Allow Unused Definitions` to `true`.
- Fix: definition will be correctly refreshed if duplicate definition exists across files.
- Fix: apply severity settings.

## v0.2.2

- Fix: rename will refresh all related files.

## v0.2.1

- Feat: rename anchors. [#2](https://github.com/DiscreteTom/vscode-anchor/issues/2)
- Fix: completion will be triggered even current line has multiple references.

## v0.2.0

- **_Breaking Change_**: apply ripgrep as the folder scanner. Make sure the definition pattern and reference pattern in your settings is compatible with rust's regex syntax. See [ripgrep's regex syntax](https://docs.rs/regex/latest/regex/index.html#syntax) for more details.
- Feat: customizable completion trigger characters.
- Feat: customizable diagnostic severity.
- Feat: add command `Code Anchor: Re-Scan Workspace Folders`.

## v0.1.1

- Fix: clear diagnostics correctly.
- Fix: incorrect semantic highlight range.

## v0.1.0

The initial release.
