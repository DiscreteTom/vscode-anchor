import * as vscode from "vscode";
import { constructPosUri, fileUri2relative, type TreeData } from "./common";

export type TreeNode = {
  kind: "definition" | "folder" | "file";
  uri: vscode.Uri;
  name: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  posUri: string;
};

export class TreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;
  readonly workspaceFolders: vscode.Uri[];

  constructor(private model: { data: TreeData }) {
    this.workspaceFolders =
      vscode.workspace.workspaceFolders?.map((f) => f.uri) ?? [];
  }

  public getTreeItem(element: TreeNode): vscode.TreeItem {
    return {
      resourceUri: element.uri,
      collapsibleState: ["definition", "folder"].includes(element.kind)
        ? vscode.TreeItemCollapsibleState.Collapsed
        : undefined,
      label: element.name,
      id: element.posUri,
      command:
        element.kind === "file"
          ? {
              title: "Go to reference",
              command: "vscode.openWith",
              arguments: [element.uri, "default", { selection: element.range }],
            }
          : undefined,
      contextValue: element.kind,
    };
  }

  public getChildren(parent?: TreeNode): TreeNode[] {
    if (parent === undefined) {
      // top level, show definitions
      return this.model.data
        .map((d) => ({
          kind: "definition" as const,
          name: d.name,
          uri: vscode.Uri.parse(d.uri),
          range: d.range,
          posUri: constructPosUri(d.uri, d.range.start),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    if (parent.kind === "definition") {
      // show references
      // TODO: show folders instead of definitions
      return (
        this.model.data
          .find((d) => d.name === parent.name)
          ?.refs.map((r) => {
            const posUri = constructPosUri(r.uri, r.range.start);
            return {
              kind: "file" as const,
              uri: vscode.Uri.parse(r.uri),
              name: fileUri2relative(
                posUri,
                this.workspaceFolders.map((uri) => uri.toString(true))
              ),
              range: r.range,
              posUri,
            };
          })
          .sort((a, b) => a.posUri.localeCompare(b.posUri)) ?? []
      );
    }

    // else, element is a reference, no children
    return [];
  }
}
