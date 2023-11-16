# CHANGELOG

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
