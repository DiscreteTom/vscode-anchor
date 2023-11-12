import * as vscode from "vscode";
import * as path from "path";
import type {
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { LanguageClient } from "vscode-languageclient/node";
import { TransportKind } from "vscode-languageclient/node";
import { GitIgnore } from "cspell-gitignore";
import * as url from "url";

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
    // TODO
    // documentSelector: [{ scheme: "file", language: "markdown" }],
    // synchronize: {
    //   fileEvents: vscode.workspace.createFileSystemWatcher("**/*.md"),
    // },
  };

  client = new LanguageClient(
    "code-anchor",
    "Code Anchor Language Server",
    serverOptions,
    clientOptions
  );

  // this will also launch the server
  await client.start();

  // send initial file list & workspace folders, ignore files that are in .gitignore
  /** file path string list. */
  const allFiles = (await vscode.workspace.findFiles("**/*")).map(
    (f) => f.fsPath
  );
  const gitIgnore = new GitIgnore(
    vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? []
  );
  /** uri string list */
  const files = (await gitIgnore.filterOutIgnored(allFiles)).map((f) =>
    url.pathToFileURL(f).toString()
  );
  console.log(
    `init: filtered ${allFiles.length} files to ${files.length} files`
  );

  await client.sendRequest("init", {
    files,
    folders:
      vscode.workspace.workspaceFolders?.map((f) => f.uri.toString()) ?? [],
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  // this will also stop the server
  return client.stop();
}
