import * as vscode from "vscode";
import { constructPosUri, type TreeData } from "./common";

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

  constructor(private model: { data: TreeData }) {}

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

  public getChildren(element?: TreeNode): TreeNode[] {
    return element === undefined
      ? this.model.data
          .map((d) => ({
            kind: "definition" as const,
            name: d.name,
            uri: vscode.Uri.parse(d.uri),
            range: d.range,
            posUri: constructPosUri(d.uri, d.range.start),
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : element.kind === "definition"
      ? this.model.data
          .find((d) => d.name === element.name)
          ?.refs.map((r) => ({
            kind: "file" as const,
            uri: vscode.Uri.parse(r.uri),
            name: r.uri,
            range: r.range,
            posUri: constructPosUri(r.uri, r.range.start),
          }))
          .sort((a, b) => a.posUri.localeCompare(b.posUri)) ?? []
      : [];
  }
}
