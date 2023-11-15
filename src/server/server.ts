import type { InitializeParams } from "vscode-languageserver/node";
import {
  createConnection,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node";
import { debounce } from "./utils";
import { state } from "./state";
import { TextDocument } from "vscode-languageserver-textdocument";
import { semanticTokenProvider } from "./semanticToken";
import { hoverProvider } from "./hover";
import { definitionProvider } from "./definition";
import { referenceProvider } from "./reference";
import { completionProvider } from "./completion";
import { renameProvider } from "./rename";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  state.setWorkspaceFolders(params.workspaceFolders?.map((f) => f.uri) ?? []);
  console.log(state.workspaceFolders);
  const options = params.initializationOptions as {
    definitionPattern: string;
    referencePattern: string;
    completionPrefixPattern: string;
    vscodeRootPath: string;
  };
  console.log(options);
  state.setPatterns({
    def: options.definitionPattern,
    ref: options.referencePattern,
    completionPrefix: options.completionPrefixPattern,
  });
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      completionProvider: {
        // TODO: make this configurable
        triggerCharacters: ["@"],
        resolveProvider: false,
      },
      semanticTokensProvider: {
        legend: {
          // [[semantic token legends]]
          tokenTypes: ["class", "type"],
          tokenModifiers: ["defaultLibrary"],
        },
        full: {
          delta: false, // TODO: support delta?
        },
      },
      definitionProvider: true,
      referencesProvider: true,
    },
  };
});

connection.languages.semanticTokens.on(semanticTokenProvider);
connection.onHover(hoverProvider);
connection.onDefinition(definitionProvider);
connection.onReferences(referenceProvider);
connection.onCompletion(completionProvider(documents));
connection.onRenameRequest(renameProvider);

connection.onRequest("code-anchor/init", async () => {
  // const folderPaths = state.workspaceFolders.map((f) => url.fileURLToPath(f));
  // const isWin = /^win/.test(process.platform);
  // const bin = (await getBinPath(params.vscodeRootPath))!;
  // folderPaths.forEach((p) => {
  //   console.log(path.join(p));
  //   search({
  //     bin,
  //     folder: p,
  //     regex: `"${state.referencePattern!.source}"`,
  //     // env: {
  //     //   ...(process.env as Record<string, string>),
  //     //   // https://github.com/nodejs/node/issues/34667#issuecomment-672863358
  //     //   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  //     //   [Object.keys(process.env).find((x) => x.toUpperCase() === "PATH")!]:
  //     //     process.env.PATH + path.delimiter + params.rgFolderPath,
  //     // },
  //   })
  //     .then((r) => {
  //       console.log(`done for ${p}`);
  //       console.log(r);
  //     })
  //     .catch((e) => {
  //       console.log(`error for ${p}`);
  //       console.error(e);
  //     });
  // });
  // console.log(`init ${params.files.length} files`);
  // await loadAll(params.files, (uri, text) => {
  //   state.scanFile(uri, text, { override: false });
  // });
  connection.languages.semanticTokens.refresh();
  state.refreshDiagnostic();
  state.uri2diagnostics.forEach((diagnostics, uri) => {
    connection.sendDiagnostics({ uri, diagnostics });
  });
  console.log(`init done`);
});

documents.listen(connection);
documents.onDidOpen((event) => {
  // console.log(`open ${event.document.uri}`);
  const text = event.document.getText();
  state.scanFile(event.document.uri, text, { override: true });
});
documents.onDidChangeContent(
  debounce(200, (change) => {
    // console.log(`change ${change.document.uri}`);
    state.scanFile(change.document.uri, change.document.getText(), {
      override: true,
    });
    connection.languages.semanticTokens.refresh();
    state.refreshDiagnostic();
    state.uri2diagnostics.forEach((diagnostics, uri) => {
      connection.sendDiagnostics({ uri, diagnostics });
    });
  })
);

connection.listen();
