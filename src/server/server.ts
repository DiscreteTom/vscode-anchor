import type { InitializeParams } from "vscode-languageserver/node";
import {
  createConnection,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node";
import { debounce, loadAll } from "./utils";
import { defaultDefinitionPattern, defaultReferencePattern } from "./regex";
import { state } from "./state";
import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((_params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // hoverProvider: true,
      // completionProvider: {
      //   resolveProvider: false,
      // },
      // semanticTokensProvider: {
      //   legend: {
      //     tokenTypes: ["type"],
      //     tokenModifiers: ["defaultLibrary"],
      //   },
      //   full: {
      //     delta: false, // TODO: support delta
      //   },
      // },
      // definitionProvider: true,
      // referencesProvider: true,
    },
  };
});

// registerHover(connection, infoMap);
// registerCompletion(connection, documents, bm);
// registerDefinition(connection, infoMap);
// registerReference(connection, infoMap);
// registerSemanticToken(connection, infoMap);

connection.onRequest(
  "code-anchor/init",
  async (params: { files: string[]; folders: string[] }) => {
    console.log(`init ${params.files.length} files`);
    await loadAll(params.files, (uri, text) => {
      state.scanFile(
        uri,
        text,
        {
          def: defaultDefinitionPattern,
          ref: defaultReferencePattern,
        },
        { override: false }
      );
    });
    console.log(`init done`);
    // re-highlight all files
    // params.files.forEach((uri) => {
    //   connection.sendNotification("semanticTokens/full", {
    //     textDocument: { uri },
    //   });
    // });
  }
);

documents.listen(connection);
documents.onDidOpen((event) => {
  console.log(`open ${event.document.uri}`);
  const text = event.document.getText();
  state.scanFile(
    event.document.uri,
    text,
    {
      def: defaultDefinitionPattern,
      ref: defaultReferencePattern,
    },
    { override: true }
  );
});
documents.onDidChangeContent(
  debounce(200, (change) => {
    console.log(`change ${change.document.uri}`);
    // TODO: only update lines that changed
    state.scanFile(
      change.document.uri,
      change.document.getText(),
      {
        def: defaultDefinitionPattern,
        ref: defaultReferencePattern,
      },
      { override: true }
    );
  })
);

connection.listen();
