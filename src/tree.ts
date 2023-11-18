import * as vscode from "vscode";
import type { TreeData } from "./common";

export type TreeNode = {
  kind: "definition" | "folder" | "file";
  uri: vscode.Uri;
  name: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
};

export class TreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private model: { data: TreeData }) {}

  public getTreeItem(element: TreeNode): vscode.TreeItem {
    const posUri = `${element.uri.toString(true)}#L${
      element.range.start.line + 1
    }:${element.range.start.character + 1}`;
    return {
      resourceUri: element.uri,
      collapsibleState: ["definition", "folder"].includes(element.kind)
        ? vscode.TreeItemCollapsibleState.Collapsed
        : undefined,
      label: element.name,
      id: posUri,
      command:
        element.kind === "file"
          ? {
              title: "Go to reference",
              command: "vscode.open",
              arguments: [posUri],
            }
          : undefined,
    };
  }

  public getChildren(element?: TreeNode): TreeNode[] {
    return element === undefined
      ? this.model.data.map((d) => ({
          kind: "definition",
          name: d.name,
          uri: vscode.Uri.parse(d.uri),
          range: d.range,
        }))
      : element.kind === "definition"
      ? this.model.data
          .find((d) => d.name === element.name)
          ?.refs.map((r) => ({
            kind: "file",
            uri: vscode.Uri.parse(r.uri),
            name: r.uri,
            range: r.range,
          })) ?? []
      : [];
  }
}
