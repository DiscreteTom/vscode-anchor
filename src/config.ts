import * as vscode from "vscode";

export const config = {
  // settings
  get definitionPattern() {
    return vscode.workspace
      .getConfiguration("codeAnchor")
      .get("definitionPattern") as string;
  },
  get referencePattern() {
    return vscode.workspace
      .getConfiguration("codeAnchor")
      .get("referencePattern") as string;
  },
  get completionPrefixPattern() {
    return vscode.workspace
      .getConfiguration("codeAnchor")
      .get("completionPrefixPattern") as string;
  },
  get completionTriggerCharacters() {
    return vscode.workspace
      .getConfiguration("codeAnchor")
      .get("completionTriggerCharacters") as string[];
  },
  get diagnosticSeverity() {
    return vscode.workspace
      .getConfiguration("codeAnchor")
      .get("diagnosticSeverity") as number;
  },
};
