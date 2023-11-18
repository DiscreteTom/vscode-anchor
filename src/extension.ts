import * as vscode from "vscode";
import * as path from "path";
import type {
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { LanguageClient } from "vscode-languageclient/node";
import { TransportKind } from "vscode-languageclient/node";
import { config } from "./config";
import type { ServerInitializationOptions, TreeData } from "./common";

let client: LanguageClient;

export async function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    path.join("dist", "server", "server.js")
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file" }],
    synchronize: {
      // TODO: ignore gitignored files
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*"),
    },
    // https://github.com/microsoft/vscode/issues/144698#issuecomment-1062751705
    uriConverters: {
      code2Protocol: (uri: vscode.Uri) => uri.toString(true),
      protocol2Code: (uri: string) => vscode.Uri.parse(uri),
    },
    initializationOptions: {
      definitionPattern: config.definitionPattern,
      referencePattern: config.referencePattern,
      completionPrefixPattern: config.completionPrefixPattern,
      completionTriggerCharacters: config.completionTriggerCharacters,
      diagnosticSeverity: config.diagnosticSeverity,
      allowUnusedDefinitions: config.allowUnusedDefinitions,
      updateFileDebounceLatency: config.updateFileDebounceLatency,
      vscodeRootPath: vscode.env.appRoot,
    } satisfies ServerInitializationOptions,
  };

  client = new LanguageClient(
    "code-anchor",
    "Code Anchor Language Server",
    serverOptions,
    clientOptions
  );

  // tree view
  // must register onRequest before client.start()
  const treeModel = { data: [] as TreeData };
  const treeDataProvider = new TreeDataProvider(treeModel);
  client.onRequest("code-anchor/refreshTree", (data) => {
    treeModel.data = data;
    treeDataProvider.emitter.fire();
  });
  context.subscriptions.push(
    vscode.window.createTreeView("codeAnchor.definitions", {
      showCollapseAll: true,
      treeDataProvider: treeDataProvider,
    })
  );

  // this will also launch the server
  await client.start();

  // update semantic highlight & diagnostics
  await client.sendRequest("code-anchor/init");

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codeAnchor.refreshWorkspaceFolders",
      async () => {
        await client.sendRequest("code-anchor/refresh");
      }
    ),
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("codeAnchor")) {
        await client.sendRequest("code-anchor/refreshSettings", {
          definitionPattern: config.definitionPattern,
          referencePattern: config.referencePattern,
          completionPrefixPattern: config.completionPrefixPattern,
          completionTriggerCharacters: config.completionTriggerCharacters,
          diagnosticSeverity: config.diagnosticSeverity,
          allowUnusedDefinitions: config.allowUnusedDefinitions,
          updateFileDebounceLatency: config.updateFileDebounceLatency,
        });
      }
    })
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  // this will also stop the server
  return client.stop();
}

type TreeNode = {
  kind: "definition" | "folder" | "file";
  uri: vscode.Uri;
  name: string;
};

class TreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
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
    };
  }

  public getChildren(element?: TreeNode): TreeNode[] {
    return element === undefined
      ? this.model.data.map((d) => ({
          kind: "definition",
          name: d.name,
          uri: vscode.Uri.parse(d.uri),
        }))
      : element.kind === "definition"
      ? this.model.data
          .find((d) => d.name === element.name)
          ?.refs.map((r) => ({
            kind: "file",
            uri: vscode.Uri.parse(r.uri),
            name: r.uri,
          })) ?? []
      : [];
  }
}
