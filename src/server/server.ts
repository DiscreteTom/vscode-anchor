import type { InitializeParams } from "vscode-languageserver/node";
import {
  createConnection,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node";
import { loadAll } from "./utils";
import { scanFile } from "./scan";
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
      //     delta: false,
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
      // defs
      scanFile(text, defaultDefinitionPattern, (name, range) => {
        state.appendDefinition(name, uri, range);
      });
      // refs
      scanFile(text, defaultReferencePattern, (name, range) => {
        state.appendReference(name, uri, range);
      });
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
// documents.onDidOpen((event) => {
//   console.log(`open ${event.document.uri}`);
//   config.files.set(event.document.uri, event.document.getText());
//   scan(event.document.uri, true);
// });
// documents.onDidChangeContent(
//   debounce((change) => {
//     console.log(`change ${change.document.uri}`);
//     config.files.set(change.document.uri, change.document.getText());
//     scan(change.document.uri, true);
//   }, 200)
// );
connection.listen();
