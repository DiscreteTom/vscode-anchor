import * as vscode from "vscode";
import * as path from "path";
import type {
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { LanguageClient } from "vscode-languageclient/node";
import { TransportKind } from "vscode-languageclient/node";
import { config } from "./config";

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
      vscodeRootPath: vscode.env.appRoot,
    },
  };

  client = new LanguageClient(
    "code-anchor",
    "Code Anchor Language Server",
    serverOptions,
    clientOptions
  );

  // this will also launch the server
  await client.start();

  // update semantic highlight & diagnostics
  await client.sendRequest("code-anchor/init");
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  // this will also stop the server
  return client.stop();
}
