import type { InitializeParams } from "vscode-languageserver/node";
import {
  createConnection,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node";
import { debounce, loadAll } from "./utils";
import { state } from "./state";
import { TextDocument } from "vscode-languageserver-textdocument";
import { semanticTokenProvider } from "./semanticToken";
import { hoverProvider } from "./hover";
import { definitionProvider } from "./definition";
import { referenceProvider } from "./reference";
import { completionProvider } from "./completion";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((_params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      completionProvider: {
        // TODO: make this configurable?
        // but we have to provide this before client send "code-anchor/init"
        triggerCharacters: ["@"],
        resolveProvider: false,
      },
      semanticTokensProvider: {
        legend: {
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

connection.onRequest(
  "code-anchor/init",
  async (params: {
    files: string[];
    folders: string[];
    definitionPattern: string;
    referencePattern: string;
    completionPrefixPattern: string;
  }) => {
    state.setWorkspaceFolders(params.folders);
    state.setPatterns({
      def: params.definitionPattern,
      ref: params.referencePattern,
      completionPrefix: params.completionPrefixPattern,
    });
    console.log(`init ${params.files.length} files`);
    await loadAll(params.files, (uri, text) => {
      state.scanFile(uri, text, { override: false });
    });
    console.log(`init done`);
  }
);

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
  })
);

connection.listen();
