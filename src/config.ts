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
};
